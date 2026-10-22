import { useEffect, useState, useRef } from "react";
import TotalStats from "./TotalStats";
import { salesAdminApi as api } from "../../../api/sales";
import { formatDrivingTime } from "./DrivingTimeFields";
import { toDateStr } from "../../../utils/dateUtils";
import { useDateRollover } from "../../../utils/useToday";
import "./sales.css";

import SalesDrivingStats from "./SalesDrivingStats";
import ReceiptModal from "./ReceiptModal";
import DrivingModal from "./DrivingModal";
import {
  fmt,
  fmtWon,
  pad2,
  TYPE_STYLE,
  getWeeksOfMonth,
  calcDistances,
} from "./salesShared";

export default function SalesAdminContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mainTab, setMainTab] = useState("list");
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("driving");
  const pendingTabRef = useRef(null); // 로드 후 이동할 탭
  const [fromTotal, setFromTotal] = useState(false); // 전체 통계 > 사람별 통계에서 들어왔는지 (뒤로가기 위치)

  const [summary, setSummary] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [monthDriving, setMonthDriving] = useState([]);
  const [dayDriving, setDayDriving] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    toDateStr(now),
  );
  // 자정이 지나면: 오늘을 보고 있었으면 새 오늘로 이동,
  // 주 잠금은 스케줄러가 바꾸므로 요약/상세 다시 불러옴 (월이 넘어가면 새 달로 이동)
  useDateRollover((prev, next) => {
    setSelectedDate((d) => (d === prev ? next : d));
    const [py, pm] = prev.split("-").map(Number);
    const [ny, nm] = next.split("-").map(Number);
    if (year === py && month === pm && (ny !== py || nm !== pm)) {
      setYear(ny); // → 요약/상세 자동 재조회
      setMonth(nm);
    } else {
      reloadSummary();
      if (selectedUser) loadDetail();
    }
  });
  const [prevMeter, setPrevMeter] = useState(0);
  const prevMeterRef = useRef(0);
  const [lastMeter, setLastMeter] = useState(0);
  const lastMeterRef = useRef(0);

  const [newCatName, setNewCatName] = useState("");

  const [showDrivingModal, setShowDrivingModal] = useState(false);
  const [destinations, setDestinations] = useState([]); // 도착지 추천 목록 (전체 영업 사원)
  const [destSearch, setDestSearch] = useState("");
  const [showDestDrop, setShowDestDrop] = useState(false);
  const destRef = useRef(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [drivingForm, setDrivingForm] = useState({});
  const [receiptForm, setReceiptForm] = useState({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const activeCats = categories; // active 컬럼 제거됨
  const daysInMonth = new Date(year, month, 0).getDate();
  const enteredDates = new Set(monthDriving.map((d) => d.date));

  const distPreview =
    drivingForm.meterReading && lastMeter
      ? parseInt(drivingForm.meterReading) - lastMeter
      : null;
  // 이후 날짜 중 가장 작은 미터기 (상한선)
  const nextMeter = (() => {
    const later = monthDriving
      .filter(
        (d) =>
          d.date > selectedDate &&
          d.meterReading > 0 &&
          (!editTarget || d.id !== editTarget.id),
      )
      .map((d) => d.meterReading);
    return later.length > 0 ? Math.min(...later) : 0;
  })();
  // 하한선: 추가는 오늘 마지막 미터기, 수정은 전일 미터기 기준
  const lowerMeter = editTarget ? prevMeter : lastMeter;
  const meterTooLow =
    drivingForm.meterReading &&
    lowerMeter > 0 &&
    parseInt(drivingForm.meterReading) < lowerMeter;
  const meterTooHigh =
    drivingForm.meterReading &&
    nextMeter > 0 &&
    parseInt(drivingForm.meterReading) > nextMeter;
  const dateOptions = Array.from(
    { length: daysInMonth },
    (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`,
  );

  // 미터기 기반 거리 재계산
  const recalcDriving = (driving, startMeter = 0) => {
    const sorted = [...driving].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (!a.arrivalTime) return 1;
      if (!b.arrivalTime) return -1;
      return a.arrivalTime.localeCompare(b.arrivalTime);
    });
    // 미터기 순으로 거리 계산 (시간 없는 개인사용도 순서 맞게)
    const distMap = calcDistances(sorted, startMeter);
    return sorted.map((d) => ({ ...d, calcDist: distMap[d.id] || 0 }));
  };

  useEffect(() => {
    api
      .getCategories()
      .then((r) => setCategories(r.data))
      .catch(() => {});
    // 도착지 추천 목록 (실패해도 입력에는 영향 없음)
    api
      .getDestinations()
      .then((r) => setDestinations(r.data))
      .catch(() => {});
  }, []);
  useEffect(() => {
    api
      .getSummary(year, month)
      .then((r) => setSummary(r.data))
      .catch(() => {});
  }, [year, month]);
  useEffect(() => {
    if (selectedUser) loadDetail();
  }, [selectedUser, year, month]);
  useEffect(() => {
    if (selectedUser && activeTab === "driving") loadDay();
  }, [selectedDate, selectedUser]);
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(null);
      if (destRef.current && !destRef.current.contains(e.target))
        setShowDestDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const loadDetail = async () => {
    try {
      const [lock, drv, rec] = await Promise.all([
        api.getLockStatus(selectedUser.username, year, month),
        api.getDriving(selectedUser.username, year, month),
        api.getReceipts(selectedUser.username, year, month),
      ]);
      setIsLocked(lock.data.locked);
      setMonthDriving(drv.data);
      setReceipts(rec.data);
      // pendingTab 처리
      if (pendingTabRef.current) {
        setActiveTab(pendingTabRef.current);
        pendingTabRef.current = null;
      }
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  const loadDay = async () => {
    try {
      const [dayRes, prevRes] = await Promise.all([
        api.getDrivingDate(selectedUser.username, selectedDate),
        api.getPrevMeter(selectedUser.username, selectedDate),
      ]);
      setDayDriving(dayRes.data);
      const pm = prevRes.data.prevMeter || 0;
      setPrevMeter(pm);
      prevMeterRef.current = pm;
      const todayMeters = dayRes.data
        .map((d) => d.meterReading)
        .filter((m) => m > 0);
      const newLM =
        todayMeters.length > 0
          ? Math.max(...todayMeters)
          : prevRes.data.prevMeter || 0;
      setLastMeter(newLM);
      lastMeterRef.current = newLM;
    } catch {}
  };

  const reloadSummary = () =>
    api
      .getSummary(year, month)
      .then((r) => setSummary(r.data))
      .catch(() => {});

  // 주 단위 잠금
  const handleWeekLock = async (user, week, currentLocked) => {
    try {
      await api.toggleLock(
        user.username,
        year,
        month,
        !currentLocked,
        week.weekNum,
      );
      setSuccess(
        !currentLocked
          ? `🔒 ${user.name} ${week.label} 잠금`
          : `🔓 ${user.name} ${week.label} 잠금 해제`,
      );
      reloadSummary();
      // 상세뷰 잠금 상태 재로드
      if (selectedUser?.username === user.username) {
        api.getLockStatus(user.username, year, month).then((r) => {
          setIsLocked(r.data.locked);
        });
      }
    } catch {
      setError("변경 실패");
    }
  };

  // 운행일지 모달
  const openDrivingAdd = async () => {
    setError("");
    setEditTarget(null);
    // 오늘 마지막 미터기 갱신
    try {
      const res = await api.getDrivingDate(selectedUser.username, selectedDate);
      const todayMeters = res.data
        .map((d) => d.meterReading)
        .filter((m) => m > 0);
      setLastMeter(
        todayMeters.length > 0 ? Math.max(...todayMeters) : prevMeter,
      );
    } catch {}
    const koreaTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    setDrivingForm({
      startDate: selectedDate,
      endDate: "",
      type: "업무",
      destination: "",
      departureTime: "",
      arrivalTime: koreaTime,
      meterReading: "",
      purpose: "",
      notes: [{ content: "", time: "" }],
      fuelAmount: "",
      fuelCost: "",
      fuelUnitPrice: "",
    });
    setShowDrivingModal(true);
  };
  const openDrivingEdit = (row) => {
    setError("");
    setEditTarget(row);
    setOpenMenu(null);
    setDrivingForm({
      startDate: row.date,
      endDate: "",
      type: row.type,
      destination: row.destination || "",
      departureTime: row.departureTime || "",
      arrivalTime: row.arrivalTime || "",
      meterReading: row.meterReading || "",
      purpose: row.purpose || "",
      notes:
        row.notes && row.notes.length > 0
          ? row.notes.map((n) => ({
              content: n.content || "",
              time: n.time || "",
            }))
          : row.purpose
            ? [{ content: row.purpose, time: "" }]
            : [{ content: "", time: "" }],
      fuelAmount: row.fuelAmount || "",
      fuelCost: row.fuelCost || "",
      fuelUnitPrice: row.fuelUnitPrice || "",
    });
    setShowDrivingModal(true);
  };
  const handleSubmitDriving = async (e) => {
    e.preventDefault();
    setError("");
    if (meterTooLow) {
      setError(`미터기는 ${fmt(lowerMeter)}km 이상이어야 합니다.`);
      return;
    }
    if (meterTooHigh) {
      setError(
        `이후 날짜에 ${fmt(nextMeter)}km 기록이 있어 그보다 클 수 없습니다.`,
      );
      return;
    }
    try {
      const payload = {
        ...drivingForm,
        date: drivingForm.startDate,
        salesUsername: selectedUser.username,
      };
      let res;
      if (editTarget) res = await api.updateDriving(editTarget.id, payload);
      else res = await api.addDriving(payload);

      // 비고 저장
      const savedId = res?.data?.id || editTarget?.id;
      if (
        savedId &&
        drivingForm.notes &&
        drivingForm.notes.some((n) => n.content && n.content.trim())
      ) {
        await api.saveDrivingNotes(
          savedId,
          drivingForm.notes.filter((n) => n.content && n.content.trim()),
        );
      }

      setSuccess(editTarget ? "수정되었습니다." : "추가되었습니다.");
      setShowDrivingModal(false);
      loadDetail();
      loadDay();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteDriving = async (id) => {
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await api.deleteDriving(id);
      loadDetail();
      loadDay();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // 법인카드 모달
  const openReceiptAdd = () => {
    setError("");
    setEditTarget(null);
    setReceiptForm({
      date: selectedDate,
      category: activeCats[0]?.name || "",
      content: "",
      amount: "",
      businessNumber: "",
      companyName: "",
    });
    setShowReceiptModal(true);
  };
  const openReceiptEdit = (row) => {
    setError("");
    setEditTarget(row);
    setOpenMenu(null);
    setReceiptForm({
      date: row.date,
      category: row.category,
      content: row.content,
      amount: row.totalAmount || "",
      businessNumber: row.businessNumber,
      companyName: row.companyName,
    });
    setShowReceiptModal(true);
  };
  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...receiptForm, salesUsername: selectedUser.username };
      if (editTarget) await api.updateReceipt(editTarget.id, payload);
      else await api.addReceipt(payload);
      setSuccess(editTarget ? "수정되었습니다." : "추가되었습니다.");
      setShowReceiptModal(false);
      loadDetail();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteReceipt = async (id) => {
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await api.deleteReceipt(id);
      loadDetail();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  const DotMenu = ({ id, onEdit, onDelete }) => (
    <div className="sl-dot-wrap" ref={openMenu === id ? menuRef : null}>
      <button
        className="dot-btn"
        onClick={() => setOpenMenu(openMenu === id ? null : id)}
      >
        ···
      </button>
      {openMenu === id && (
        <div className="dot-dropdown">
          <button className="dot-menu-item" onClick={onEdit}>
            수정
          </button>
          <button className="dot-menu-item danger" onClick={onDelete}>
            삭제
          </button>
        </div>
      )}
    </div>
  );

  const yearMonthSelects = (
    <>
      <select
        className="sl-select is-compact"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}년
          </option>
        ))}
      </select>
      <select
        className="sl-select is-compact"
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {m}월
          </option>
        ))}
      </select>
    </>
  );

  const startMeter = prevMeterRef.current || prevMeter;

  return (
    <div className="sac-wrapper">
      {/* 메인 탭 */}
      <div className="sl-tab-bar sl-tab-bar-main">
        {[
          { id: "list", label: "📊 정산 목록" },
          { id: "total", label: "📈 전체 통계" },
          { id: "category", label: "🏷 카테고리" },
        ].map((t) => (
          <button
            key={t.id}
            className={`sl-tab ${mainTab === t.id ? "active" : ""}`}
            onClick={() => {
              setMainTab(t.id);
              setSelectedUser(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="sl-alert sl-alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="sl-alert sl-alert-success" onClick={() => setSuccess("")}>
          {success}
        </div>
      )}

      {/* ──── 전체 통계 ──── */}
      {mainTab === "total" && (
        <TotalStats
          summary={summary}
          year={year}
          month={month}
          years={years}
          months={months}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onUserClick={(u) => {
            pendingTabRef.current = "stats";
            setFromTotal(true);
            setSelectedUser(u);
            setMainTab("list");
          }}
        />
      )}

      {/* ──── 카테고리 ──── */}
      {mainTab === "category" && (
        <CategoryPanel
          categories={categories}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          onAdd={handleAddCategory}
          onDelete={(c) => {
            if (window.confirm("삭제?"))
              api
                .deleteCategory(c.id)
                .then(() => api.getCategories().then((r) => setCategories(r.data)));
          }}
        />
      )}

      {/* ──── 정산 목록 (사람별 카드) ──── */}
      {mainTab === "list" && !selectedUser && (
        <div>
          <div className="sac-filter-bar">{yearMonthSelects}</div>
          <div className="sac-card-grid">
            {summary.map((u) => (
              <UserSummaryCard
                key={u.username}
                user={u}
                weeks={getWeeksOfMonth(year, month)}
                onOpen={() => {
                  setFromTotal(false);
                  setSelectedUser(u);
                  setSelectedDate(toDateStr(now));
                  setActiveTab("driving");
                }}
                onWeekLock={handleWeekLock}
              />
            ))}
          </div>
        </div>
      )}

      {/* ──── 상세 (한 사람) ──── */}
      {mainTab === "list" && selectedUser && (
        <div>
          <div className="sac-filter-bar">
            <button
              className="sl-btn-back"
              onClick={() => {
                setSelectedUser(null);
                setDayDriving([]);
                if (fromTotal) setMainTab("total");
              }}
            >
              {fromTotal ? "← 전체 통계" : "← 목록"}
            </button>
            {yearMonthSelects}
            <span className="sl-filter-name">{selectedUser.name}</span>
          </div>
          {isLocked && <div className="locked-banner">✅ 정산 완료된 달입니다.</div>}

          {/* 서브 탭 + 추가 버튼 */}
          <div className="sl-subtab-row">
            <div className="sl-tab-bar sl-tab-bar-flush">
              {[
                { id: "driving", label: "📋 운행일지" },
                { id: "receipt", label: "💳 법인카드" },
                { id: "stats", label: "📊 통계" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`sl-tab ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="sl-subtab-actions">
              {!isLocked && activeTab === "driving" && (
                <button className="sl-btn-primary" onClick={openDrivingAdd}>
                  ＋ 추가
                </button>
              )}
              {!isLocked && activeTab === "receipt" && (
                <button className="sl-btn-primary" onClick={openReceiptAdd}>
                  ＋ 지출내역
                </button>
              )}
            </div>
          </div>

          {/* ── 운행일지 탭 ── */}
          {activeTab === "driving" && (
            <div className="sl-tab-panel">
              <div className="sl-date-row">
                <select
                  className="sl-select is-compact sl-grow"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {dateOptions.map((d) => (
                    <option key={d} value={d}>
                      {month}월 {parseInt(d.split("-")[2])}일
                      {d === toDateStr(now) ? " (오늘)" : ""}
                      {enteredDates.has(d) ? " ●" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {dayDriving.length === 0 ? (
                <div className="empty-state">기록이 없습니다.</div>
              ) : (
                <>
                  <DayDrivingTable
                    rows={recalcDriving(dayDriving, startMeter)}
                    showMenu={!isLocked}
                    renderMenu={(d) => (
                      <DotMenu
                        id={d.id}
                        onEdit={() => openDrivingEdit(d)}
                        onDelete={() => handleDeleteDriving(d.id)}
                      />
                    )}
                  />
                  <DaySummary rows={recalcDriving(dayDriving, startMeter)} startMeter={startMeter} />
                </>
              )}
            </div>
          )}

          {/* ── 법인카드 탭 ── */}
          {activeTab === "receipt" && (
            <ReceiptTable
              receipts={receipts}
              showMenu={!isLocked}
              renderMenu={(r) => (
                <DotMenu
                  id={`r-${r.id}`}
                  onEdit={() => openReceiptEdit(r)}
                  onDelete={() => handleDeleteReceipt(r.id)}
                />
              )}
            />
          )}

          {/* ── 통계 탭 ── */}
          {activeTab === "stats" && (
            <div className="sl-tab-panel">
              <SalesDrivingStats
                username={selectedUser.username}
                name={selectedUser.name}
                year={year}
                month={month}
              />
            </div>
          )}

          {showDrivingModal && (
            <DrivingModal
              form={drivingForm}
              setForm={setDrivingForm}
              isEdit={!!editTarget}
              error={error}
              onClose={() => setShowDrivingModal(false)}
              onSubmit={handleSubmitDriving}
              meter={{
                lowerMeter,
                nextMeter,
                distPreview,
                tooLow: meterTooLow,
                tooHigh: meterTooHigh,
              }}
              dest={{
                list: destinations,
                search: destSearch,
                setSearch: setDestSearch,
                show: showDestDrop,
                setShow: setShowDestDrop,
                ref: destRef,
              }}
            />
          )}
          {showReceiptModal && (
            <ReceiptModal
              form={receiptForm}
              setForm={setReceiptForm}
              isEdit={!!editTarget}
              categories={activeCats}
              error={error}
              onClose={() => setShowReceiptModal(false)}
              onSubmit={handleSubmitReceipt}
            />
          )}
        </div>
      )}
    </div>
  );

  function handleAddCategory(e) {
    e.preventDefault();
    setError("");
    if (!newCatName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    api
      .addCategory(newCatName.trim())
      .then(() => {
        setNewCatName("");
        setSuccess("추가되었습니다.");
        api.getCategories().then((r) => setCategories(r.data));
      })
      .catch((err) => setError(err.response?.data?.error || "추가 실패"));
  }
}

// ──── 🏷 카테고리 (추가 · 목록 · 삭제) ────
function CategoryPanel({ categories, newCatName, setNewCatName, onAdd, onDelete }) {
  return (
    <div>
      <div className="sl-panel">
        <h3 className="sl-panel-title">카테고리 추가</h3>
        <form className="sl-inline-form" onSubmit={onAdd}>
          <input
            type="text"
            className="sl-text-input"
            placeholder="카테고리 이름"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <button type="submit" className="sl-btn-primary">
            추가
          </button>
        </form>
      </div>
      <div className="sac-table-wrap">
        <table className="sac-table">
          <thead>
            <tr>
              <th>카테고리명</th>
              <th className="sl-col-action"></th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={2} className="sl-empty-cell">
                  없음
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td className="sl-cell-name">{c.name}</td>
                  <td>
                    <button className="sl-btn-delete" onClick={() => onDelete(c)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──── 정산 목록 카드 (한 사람 요약 + 주 단위 잠금) ────
function UserSummaryCard({ user: u, weeks, onOpen, onWeekLock }) {
  const countClass = (n, color) => `sl-card-value ${n > 0 ? color : "sl-text-none"}`;
  return (
    <div
      className={`sac-user-card${u.locked ? " is-locked" : u.hasData ? " has-data" : ""}`}
    >
      <div className="sl-card-body" onClick={onOpen}>
        <div className="sl-card-name">{u.name}</div>
        {u.cardNumber && <div className="sl-card-number">{u.cardNumber}</div>}
        <div className="sl-card-stats">
          <div className="sl-card-line">
            <span className="sl-muted">운행일지</span>
            <span className={countClass(u.drivingCount, "sl-text-blue")}>
              {u.drivingCount > 0 ? `${u.drivingCount}건` : "없음"}
            </span>
          </div>
          <div className="sl-card-line is-gap">
            <span className="sl-muted">법인카드</span>
            <span className={countClass(u.receiptCount, "sl-text-green")}>
              {u.receiptCount > 0 ? `${u.receiptCount}건` : "없음"}
            </span>
          </div>
          {u.totalDist > 0 && (
            <div className="sl-card-dist">
              <div className="sl-row-between">
                <span className="sl-faint">총 운행거리</span>
                <span className="sl-card-value sl-text-blue">{fmt(u.totalDist)}km</span>
              </div>
              <div className="sl-card-subline">
                <span className="sl-faintest">└ 업무 / 개인</span>
                <span className="sl-muted">
                  {fmt(u.workDist)}km /{" "}
                  <span className="sl-text-purple">{fmt(u.personalDist)}km</span>
                </span>
              </div>
              <div className="sl-row-between">
                <span className="sl-faint">총 주유량</span>
                <span className="sl-card-value sl-text-amber">
                  {u.totalFuelL ? u.totalFuelL.toFixed(1) + "L" : "-"}
                </span>
              </div>
              <div className="sl-row-between">
                <span className="sl-faint">평균 연비</span>
                <span className="sl-card-value sl-text-green">
                  {u.avgKmL ? u.avgKmL + "km/L" : "-"}
                </span>
              </div>
              <div className="sl-row-between">
                <span className="sl-faint">총 주유금액</span>
                <span className="sl-card-value sl-text-violet">
                  {u.totalFuelC ? fmtWon(u.totalFuelC) : "-"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 주 단위 잠금 버튼 (기록 없음 = 자동 잠금, false = 관리자가 열어줌) */}
      <div className="sl-week-lock">
        <p className="sl-week-lock-title">📅 주 단위 관리</p>
        <div className="sl-week-lock-row">
          {weeks.map((week) => {
            const wLocked = (u.weekLocks || {})[week.weekNum] !== false;
            return (
              <button
                key={week.weekNum}
                className={`sl-week-btn${wLocked ? " is-locked" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onWeekLock(u, week, wLocked);
                }}
              >
                <div>{wLocked ? "🔒" : "🔓"}</div>
                <div className="sl-week-label">{week.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──── 하루 운행 기록 표 ────
function DayDrivingTable({ rows, showMenu, renderMenu }) {
  return (
    <div className="sac-table-wrap sl-scroll-x">
      <table className="sac-table sl-min-700">
        <thead>
          <tr>
            <th>시간</th>
            <th>도착지</th>
            <th className="sl-num">미터기</th>
            <th className="sl-num">운행거리</th>
            <th>비고</th>
            <th className="sl-num">주유량</th>
            <th className="sl-num">주유금액</th>
            <th className="sl-num">단가</th>
            <th>구분</th>
            {showMenu && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const ts = TYPE_STYLE[d.type] || { bg: "#f3f4f6", color: "#555" };
            return (
              <tr key={d.id}>
                <td>
                  {d.arrivalTime ? (
                    <span className="sl-time-badge">⏰ {formatDrivingTime(d)}</span>
                  ) : (
                    <span className="sl-none">-</span>
                  )}
                </td>
                <td className={d.destination ? "sl-cell-dest" : "sl-cell-empty"}>
                  {d.destination || "-"}
                </td>
                <td className="sl-num">
                  {d.meterReading > 0 ? `${fmt(d.meterReading)}km` : "-"}
                </td>
                <td className="sl-num sl-cell-dist">
                  {d.calcDist > 0 ? `${fmt(d.calcDist)}km` : "-"}
                </td>
                <td className="sl-cell-notes">
                  {d.notes && d.notes.length > 0 ? (
                    d.notes.map((n, i) => (
                      <div key={i} className="sl-note-line">
                        {n.time && <span className="sl-note-time-badge">{n.time}</span>}
                        <span className="sl-note-content">{n.content}</span>
                      </div>
                    ))
                  ) : (
                    <span className="sl-none">-</span>
                  )}
                </td>
                <td className="sl-num sl-text-amber">
                  {d.fuelAmount > 0 ? `${d.fuelAmount}L` : "-"}
                </td>
                <td className="sl-num">{d.fuelCost > 0 ? fmtWon(d.fuelCost) : "-"}</td>
                <td className="sl-num sl-cell-small-muted">
                  {d.fuelUnitPrice > 0 ? `${fmt(d.fuelUnitPrice)}원` : "-"}
                </td>
                <td>
                  <span
                    className="sl-type-badge"
                    style={{ "--type-color": ts.color, "--type-bg": ts.bg }}
                  >
                    {d.type}
                  </span>
                </td>
                {showMenu && <td className="sl-cell-menu">{renderMenu(d)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ──── 하루 합계 (전일누계 · 금일누계 · 업무 · 개인 · 총누계 · 금일주유) ────
function DaySummary({ rows, startMeter }) {
  const km = (n) => (n > 0 ? `${fmt(n)}km` : "-");
  const sumDist = (type) =>
    rows.filter((d) => !type || d.type === type).reduce((s, d) => s + d.calcDist, 0);
  const meters = rows.map((d) => d.meterReading).filter((m) => m > 0);
  const endMeter = meters.length ? Math.max(...meters) : 0;
  const totalFuelC = rows.reduce((s, d) => s + (d.fuelCost || 0), 0);

  const items = [
    { label: "전일누계", value: km(startMeter), color: "#555" },
    { label: "금일누계", value: km(sumDist()), color: "#1557b0" },
    { label: "업무", value: km(sumDist("업무")), color: "#1557b0" },
    { label: "개인", value: km(sumDist("개인사용")), color: "#6d28d9" },
    { label: "총누계", value: km(endMeter), color: "#059669" },
    ...(totalFuelC > 0
      ? [{ label: "금일주유", value: fmtWon(totalFuelC), color: "#92400e" }]
      : []),
  ];
  return (
    <div className="sl-day-summary">
      <div className="sl-day-summary-row">
        {items.map((r, i) => (
          <div
            key={r.label}
            className={`sl-day-summary-cell${i === items.length - 1 ? " is-last" : ""}`}
          >
            <div className="sl-stat-label">{r.label}</div>
            <div className="sl-stat-value" style={{ color: r.color }}>
              {r.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── 법인카드 표 (+ 합계) ────
function ReceiptTable({ receipts, showMenu, renderMenu }) {
  const sum = (key) => receipts.reduce((s, r) => s + (r[key] || 0), 0);
  return (
    <div className="sac-table-wrap sl-tab-panel sl-scroll-x">
      <table className="sac-table sl-min-600">
        <thead>
          <tr>
            <th>날짜</th>
            <th>카테고리</th>
            <th>신용카드 번호</th>
            <th className="sl-num">총금액</th>
            <th className="sl-num">공급가액</th>
            <th className="sl-num">VAT</th>
            <th>사업자</th>
            <th>상호</th>
            {showMenu && <th></th>}
          </tr>
        </thead>
        <tbody>
          {receipts.length === 0 ? (
            <tr>
              <td colSpan={9} className="sl-empty-cell is-tall">
                내역 없음
              </td>
            </tr>
          ) : (
            receipts.map((r) => (
              <tr key={r.id}>
                <td className="sl-cell-date">{r.date}</td>
                <td>{r.category ? <span className="cat-badge">{r.category}</span> : "-"}</td>
                <td className="sl-cell-ellipsis">{r.content || "-"}</td>
                <td className="sl-num sl-cell-amount">
                  {r.totalAmount ? fmtWon(r.totalAmount) : "-"}
                </td>
                <td className="sl-num sl-cell-supply">
                  {r.supplyAmount ? fmtWon(r.supplyAmount) : "-"}
                </td>
                <td className="sl-num sl-cell-vat">{r.vat ? fmtWon(r.vat) : "-"}</td>
                <td className="sl-small">{r.businessNumber || "-"}</td>
                <td className="sl-cell-ellipsis is-narrow sl-small">{r.companyName || "-"}</td>
                {showMenu && <td className="sl-cell-menu">{renderMenu(r)}</td>}
              </tr>
            ))
          )}
        </tbody>
        {receipts.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={3} className="sl-text-blue">
                합계
              </td>
              <td className="sl-num sl-nowrap sl-text-blue">{fmtWon(sum("totalAmount"))}</td>
              <td className="sl-num sl-nowrap sl-text-sub">{fmtWon(sum("supplyAmount"))}</td>
              <td className="sl-num sl-nowrap sl-text-green">{fmtWon(sum("vat"))}</td>
              <td colSpan={showMenu ? 3 : 2}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
