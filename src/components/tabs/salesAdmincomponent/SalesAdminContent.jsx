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
    <div
      style={{ position: "relative", display: "inline-block" }}
      ref={openMenu === id ? menuRef : null}
    >
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

  return (
    <div className="sac-wrapper">
      {/* 메인 탭 */}
      <div className="sl-tab-bar" style={{ marginBottom: "16px" }}>
        <button
          className={`sl-tab ${mainTab === "list" ? "active" : ""}`}
          onClick={() => {
            setMainTab("list");
            setSelectedUser(null);
          }}
        >
          📊 정산 목록
        </button>
        <button
          className={`sl-tab ${mainTab === "total" ? "active" : ""}`}
          onClick={() => {
            setMainTab("total");
            setSelectedUser(null);
          }}
        >
          📈 전체 통계
        </button>
        <button
          className={`sl-tab ${mainTab === "category" ? "active" : ""}`}
          onClick={() => {
            setMainTab("category");
            setSelectedUser(null);
          }}
        >
          🏷 카테고리
        </button>
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

      {/* ──── 카테고리 (메인 탭) ──── */}
      {mainTab === "category" && (
        <div>
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              border: "1px solid #e8eaed",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              카테고리 추가
            </h3>
            <form
              onSubmit={handleAddCategory}
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <input
                type="text"
                placeholder="카테고리 이름"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  border: "1.5px solid #d8dce3",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
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
                  <th style={{ width: "70px" }}></th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "#bbb",
                      }}
                    >
                      없음
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>
                        <button
                          className="sl-btn-delete"
                          onClick={() => {
                            if (window.confirm("삭제?"))
                              api
                                .deleteCategory(c.id)
                                .then(() =>
                                  api
                                    .getCategories()
                                    .then((r) => setCategories(r.data)),
                                );
                          }}
                        >
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
      )}

      {/* ──── 카드뷰 ──── */}
      {mainTab === "list" && !selectedUser && (
        <div>
          <div className="sac-filter-bar">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={selStyle}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={selStyle}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </div>
          <div className="sac-card-grid">
            {summary.map((u) => {
              return (
                <div
                  key={u.username}
                  className="sac-user-card"
                  style={{
                    borderColor: u.locked
                      ? "#c6f6d5"
                      : u.hasData
                        ? "#bfdbfe"
                        : "#f0f0f0",
                  }}
                >
                  <div
                    onClick={() => {
                      setFromTotal(false);
                      setSelectedUser(u);
                      setSelectedDate(toDateStr(now));
                      setActiveTab("driving");
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        marginBottom: "2px",
                        color: "#1a1a2e",
                      }}
                    >
                      {u.name}
                    </div>
                    {u.cardNumber && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#aaa",
                          marginBottom: "8px",
                          fontFamily: "monospace",
                        }}
                      >
                        {u.cardNumber}
                      </div>
                    )}
                    <div style={{ fontSize: "12px", marginBottom: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "3px",
                        }}
                      >
                        <span style={{ color: "#888" }}>운행일지</span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: u.drivingCount > 0 ? "#1557b0" : "#ccc",
                          }}
                        >
                          {u.drivingCount > 0 ? `${u.drivingCount}건` : "없음"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ color: "#888" }}>법인카드</span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: u.receiptCount > 0 ? "#059669" : "#ccc",
                          }}
                        >
                          {u.receiptCount > 0 ? `${u.receiptCount}건` : "없음"}
                        </span>
                      </div>
                      {u.totalDist > 0 && (
                        <div
                          style={{
                            borderTop: "1px solid #f0f2f5",
                            paddingTop: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: "#aaa" }}>총 운행거리</span>
                            <span style={{ fontWeight: 600, color: "#1557b0" }}>
                              {fmt(u.totalDist)}km
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              paddingLeft: "8px",
                            }}
                          >
                            <span style={{ color: "#bbb" }}>└ 업무 / 개인</span>
                            <span style={{ color: "#888" }}>
                              {fmt(u.workDist)}km /{" "}
                              <span style={{ color: "#6d28d9" }}>
                                {fmt(u.personalDist)}km
                              </span>
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: "#aaa" }}>총 주유량</span>
                            <span style={{ fontWeight: 600, color: "#92400e" }}>
                              {u.totalFuelL
                                ? u.totalFuelL.toFixed(1) + "L"
                                : "-"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: "#aaa" }}>평균 연비</span>
                            <span style={{ fontWeight: 600, color: "#059669" }}>
                              {u.avgKmL ? u.avgKmL + "km/L" : "-"}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ color: "#aaa" }}>총 주유금액</span>
                            <span style={{ fontWeight: 600, color: "#7c3aed" }}>
                              {u.totalFuelC ? fmtWon(u.totalFuelC) : "-"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 주 단위 잠금 버튼 */}
                  <div
                    style={{
                      borderTop: "1px solid #f0f2f5",
                      paddingTop: "10px",
                      marginTop: "4px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        color: "#aaa",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      📅 주 단위 관리
                    </p>
                    <div
                      style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
                    >
                      {getWeeksOfMonth(year, month).map((week) => {
                        const dbRecord = (u.weekLocks || {})[week.weekNum];
                        // undefined=레코드없음(자동잠금), true=명시적잠금, false=관리자해제
                        const wLocked = dbRecord !== false;
                        return (
                          <button
                            key={week.weekNum}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWeekLock(u, week, wLocked);
                            }}
                            style={{
                              flex: 1,
                              minWidth: "44px",
                              padding: "6px 4px",
                              border: "1.5px solid",
                              borderRadius: "7px",
                              fontSize: "10px",
                              cursor: "pointer",
                              fontWeight: 600,
                              textAlign: "center",
                              background: wLocked ? "#d1fae5" : "#f8f9fb",
                              color: wLocked ? "#065f46" : "#555",
                              borderColor: wLocked ? "#86efac" : "#e0e0e0",
                            }}
                          >
                            <div>{wLocked ? "🔒" : "🔓"}</div>
                            <div style={{ fontSize: "9px", marginTop: "1px" }}>
                              {week.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──── 상세뷰 ──── */}
      {mainTab === "list" && selectedUser && (
        <div>
          {/* 필터바 */}
          <div className="sac-filter-bar">
            <button
              onClick={() => {
                setSelectedUser(null);
                setDayDriving([]);
                if (fromTotal) setMainTab("total");
              }}
              style={outlineBtn}
            >
              {fromTotal ? "← 전체 통계" : "← 목록"}
            </button>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={selStyle}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={selStyle}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>
              {selectedUser.name}
            </span>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            ></div>
          </div>
          {isLocked && (
            <div className="locked-banner">✅ 정산 완료된 달입니다.</div>
          )}
          {/* 서브 탭 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <div className="sl-tab-bar" style={{ marginBottom: 0 }}>
              <button
                className={`sl-tab ${activeTab === "driving" ? "active" : ""}`}
                onClick={() => setActiveTab("driving")}
              >
                📋 운행일지
              </button>
              <button
                className={`sl-tab ${activeTab === "receipt" ? "active" : ""}`}
                onClick={() => setActiveTab("receipt")}
              >
                💳 법인카드
              </button>

              <button
                className={`sl-tab ${activeTab === "stats" ? "active" : ""}`}
                onClick={() => setActiveTab("stats")}
              >
                📊 통계
              </button>
            </div>
            <div style={{ marginLeft: "8px" }}>
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
            <div style={{ marginTop: "4px" }}>
              {/* 날짜 선택 */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "10px",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ ...selStyle, flex: 1 }}
                >
                  {dateOptions.map((d) => {
                    const day = parseInt(d.split("-")[2]);
                    const hasE = enteredDates.has(d);
                    const isT = d === toDateStr(now);
                    return (
                      <option key={d} value={d}>
                        {month}월 {day}일{isT ? " (오늘)" : ""}
                        {hasE ? " ●" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 운행 기록 표 */}
              {dayDriving.length === 0 ? (
                <div className="empty-state">기록이 없습니다.</div>
              ) : (
                <div className="sac-table-wrap" style={{ overflowX: "auto" }}>
                  <table className="sac-table" style={{ minWidth: "700px" }}>
                    <thead>
                      <tr>
                        <th>시간</th>
                        <th>도착지</th>
                        <th style={{ textAlign: "right" }}>미터기</th>
                        <th style={{ textAlign: "right" }}>운행거리</th>
                        <th>비고</th>
                        <th style={{ textAlign: "right" }}>주유량</th>
                        <th style={{ textAlign: "right" }}>주유금액</th>
                        <th style={{ textAlign: "right" }}>단가</th>
                        <th>구분</th>
                        {!isLocked && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const calc = recalcDriving(
                          dayDriving,
                          prevMeterRef.current || prevMeter,
                        );
                        return calc.map((d) => {
                          const ts = TYPE_STYLE[d.type] || {
                            bg: "#f3f4f6",
                            color: "#555",
                          };
                          return (
                            <tr key={d.id}>
                              <td>
                                {d.arrivalTime ? (
                                  <span
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 700,
                                      color: "#1557b0",
                                      background: "#e8f0fe",
                                      padding: "2px 8px",
                                      borderRadius: "6px",
                                      letterSpacing: "0.5px",
                                    }}
                                  >
                                    ⏰ {formatDrivingTime(d)}
                                  </span>
                                ) : (
                                  <span style={{ color: "#ccc" }}>-</span>
                                )}
                              </td>
                              <td
                                style={{
                                  fontWeight: d.destination ? 500 : 400,
                                  color: d.destination ? "#1a1a2e" : "#ccc",
                                }}
                              >
                                {d.destination || "-"}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {d.meterReading > 0
                                  ? `${fmt(d.meterReading)}km`
                                  : "-"}
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  fontWeight: 600,
                                  color: "#1557b0",
                                }}
                              >
                                {d.calcDist > 0 ? `${fmt(d.calcDist)}km` : "-"}
                              </td>
                              <td style={{ fontSize: "12px", color: "#555" }}>
                                {d.notes && d.notes.length > 0 ? (
                                  d.notes.map((n, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        marginBottom: "2px",
                                      }}
                                    >
                                      {n.time && (
                                        <span
                                          style={{
                                            fontSize: "11px",
                                            color: "#1557b0",
                                            fontWeight: 700,
                                            background: "#e8f0fe",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {n.time}
                                        </span>
                                      )}
                                      <span
                                        style={{
                                          fontSize: "12px",
                                          color: "#374151",
                                        }}
                                      >
                                        {n.content}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span style={{ color: "#ccc" }}>-</span>
                                )}
                              </td>
                              <td
                                style={{ textAlign: "right", color: "#92400e" }}
                              >
                                {d.fuelAmount > 0 ? `${d.fuelAmount}L` : "-"}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {d.fuelCost > 0 ? fmtWon(d.fuelCost) : "-"}
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  fontSize: "12px",
                                  color: "#888",
                                }}
                              >
                                {d.fuelUnitPrice > 0
                                  ? `${fmt(d.fuelUnitPrice)}원`
                                  : "-"}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    padding: "3px 8px",
                                    borderRadius: "99px",
                                    background: ts.bg,
                                    color: ts.color,
                                  }}
                                >
                                  {d.type}
                                </span>
                              </td>
                              {!isLocked && (
                                <td style={{ position: "relative" }}>
                                  <DotMenu
                                    id={d.id}
                                    onEdit={() => openDrivingEdit(d)}
                                    onDelete={() => handleDeleteDriving(d.id)}
                                  />
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 당일 누계 */}
              {dayDriving.length > 0 &&
                (() => {
                  const calc = recalcDriving(
                    dayDriving,
                    prevMeterRef.current || prevMeter,
                  );
                  const meters = calc
                    .map((d) => d.meterReading)
                    .filter((m) => m > 0);
                  const endMeter = meters.length ? Math.max(...meters) : 0;
                  const totalKm = calc.reduce((s, d) => s + d.calcDist, 0);
                  const workKm = calc
                    .filter((d) => d.type === "업무")
                    .reduce((s, d) => s + d.calcDist, 0);
                  const personalKm = calc
                    .filter((d) => d.type === "개인사용")
                    .reduce((s, d) => s + d.calcDist, 0);
                  const totalFuelC = calc.reduce(
                    (s, d) => s + (d.fuelCost || 0),
                    0,
                  );
                  return (
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: "10px",
                        border: "1px solid #e8eaed",
                        overflow: "hidden",
                        marginTop: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          borderBottom: "1px solid #f0f2f5",
                        }}
                      >
                        {[
                          {
                            label: "전일누계",
                            value:
                              (prevMeterRef.current || prevMeter) > 0
                                ? `${fmt(prevMeterRef.current || prevMeter)}km`
                                : "-",
                            color: "#555",
                          },
                          {
                            label: "금일누계",
                            value: totalKm > 0 ? `${fmt(totalKm)}km` : "-",
                            color: "#1557b0",
                          },
                          {
                            label: "업무",
                            value: workKm > 0 ? `${fmt(workKm)}km` : "-",
                            color: "#1557b0",
                          },
                          {
                            label: "개인",
                            value:
                              personalKm > 0 ? `${fmt(personalKm)}km` : "-",
                            color: "#6d28d9",
                          },
                          {
                            label: "총누계",
                            value: endMeter > 0 ? `${fmt(endMeter)}km` : "-",
                            color: "#059669",
                          },
                          ...(totalFuelC > 0
                            ? [
                                {
                                  label: "금일주유",
                                  value: fmtWon(totalFuelC),
                                  color: "#92400e",
                                },
                              ]
                            : []),
                        ].map((r, i, arr) => (
                          <div
                            key={r.label}
                            style={{
                              flex: 1,
                              padding: "10px 12px",
                              textAlign: "center",
                              borderRight:
                                i < arr.length - 1
                                  ? "1px solid #f0f2f5"
                                  : "none",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#aaa",
                                marginBottom: "3px",
                                fontWeight: 600,
                              }}
                            >
                              {r.label}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: r.color,
                              }}
                            >
                              {r.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
          {/* ── 법인카드 탭 ── */}
          {activeTab === "receipt" && (
            <div
              className="sac-table-wrap"
              style={{ marginTop: "4px", overflowX: "auto" }}
            >
              <table className="sac-table" style={{ minWidth: "600px" }}>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>카테고리</th>
                    <th>신용카드 번호</th>
                    <th style={{ textAlign: "right" }}>총금액</th>
                    <th style={{ textAlign: "right" }}>공급가액</th>
                    <th style={{ textAlign: "right" }}>VAT</th>
                    <th>사업자</th>
                    <th>상호</th>
                    {!isLocked && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          padding: "2.5rem",
                          color: "#bbb",
                        }}
                      >
                        내역 없음
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.id}>
                        <td
                          style={{
                            fontSize: "12px",
                            color: "#888",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.date}
                        </td>
                        <td>
                          {r.category ? (
                            <span className="cat-badge">{r.category}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          style={{
                            maxWidth: "120px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.content || "-"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            color: "#1557b0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.totalAmount ? fmtWon(r.totalAmount) : "-"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "#555",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.supplyAmount ? fmtWon(r.supplyAmount) : "-"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "#059669",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.vat ? fmtWon(r.vat) : "-"}
                        </td>
                        <td style={{ fontSize: "12px" }}>
                          {r.businessNumber || "-"}
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            maxWidth: "80px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.companyName || "-"}
                        </td>
                        {!isLocked && (
                          <td style={{ position: "relative" }}>
                            <DotMenu
                              id={`r-${r.id}`}
                              onEdit={() => openReceiptEdit(r)}
                              onDelete={() => handleDeleteReceipt(r.id)}
                            />
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {receipts.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ color: "#1557b0" }}>
                        합계
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#1557b0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtWon(
                          receipts.reduce(
                            (s, r) => s + (r.totalAmount || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#555",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtWon(
                          receipts.reduce(
                            (s, r) => s + (r.supplyAmount || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#059669",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtWon(receipts.reduce((s, r) => s + (r.vat || 0), 0))}
                      </td>
                      <td colSpan={isLocked ? 2 : 3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          {/* ── 통계 탭 ── */}
          {activeTab === "stats" && (
            <div style={{ marginTop: "4px" }}>
              <SalesDrivingStats
                username={selectedUser.username}
                name={selectedUser.name}
                year={year}
                month={month}
              />
            </div>
          )}
          {/* ── 카테고리 탭 ── */}
          {activeTab === "category" && (
            <div style={{ marginTop: "4px" }}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #e8eaed",
                  padding: "16px",
                  marginBottom: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "12px",
                  }}
                >
                  카테고리 추가
                </h3>
                <form
                  onSubmit={handleAddCategory}
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <input
                    type="text"
                    placeholder="카테고리 이름"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      border: "1.5px solid #d8dce3",
                      borderRadius: "8px",
                      fontSize: "13px",
                      outline: "none",
                    }}
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
                      <th style={{ width: "70px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "#bbb",
                          }}
                        >
                          없음
                        </td>
                      </tr>
                    ) : (
                      categories.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 500 }}>{c.name}</td>
                          <td>
                            <button
                              className="sl-btn-delete"
                              onClick={() => {
                                if (window.confirm("삭제?"))
                                  api
                                    .deleteCategory(c.id)
                                    .then(() =>
                                      api
                                        .getCategories()
                                        .then((r) => setCategories(r.data)),
                                    );
                              }}
                            >
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
          )}
          {/* 운행일지 모달 */}
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
          {/* 법인카드 모달 */} {/* 법인카드 모달 */}
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

const selStyle = {
  padding: "7px 12px",
  border: "1.5px solid #d8dce3",
  borderRadius: "7px",
  fontSize: "13px",
  outline: "none",
  background: "#fff",
};
const outlineBtn = {
  padding: "7px 12px",
  border: "1.5px solid #e0e0e0",
  borderRadius: "8px",
  background: "#fff",
  cursor: "pointer",
  fontSize: "13px",
  color: "#555",
};
