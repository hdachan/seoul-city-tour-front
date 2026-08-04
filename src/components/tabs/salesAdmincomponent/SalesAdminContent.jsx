import { useEffect, useState, useRef } from "react";
import TotalStats from "./TotalStats";
import axios from "axios";
import "./SalesAdminContent.css"; // 수정

import SalesDrivingStats from "./SalesDrivingStats";

const BASE_URL = "http://localhost:8080/api";
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});

const api = {
  getSalesUsers: () =>
    axios.get(`${BASE_URL}/sales-admin/sales-users`, authHeader()),
  getSummary: (y, m) =>
    axios.get(`${BASE_URL}/sales-admin/summary`, {
      ...authHeader(),
      params: { year: y, month: m },
    }),
  getLockStatus: (u, y, m) =>
    axios.get(`${BASE_URL}/sales-admin/lock-status`, {
      ...authHeader(),
      params: { salesUsername: u, year: y, month: m },
    }),
  toggleLock: (u, y, m, l, weekNum = 0) =>
    axios.post(
      `${BASE_URL}/sales-admin/lock`,
      { salesUsername: u, year: y, month: m, locked: l, weekNum },
      authHeader(),
    ),
  getCategories: () =>
    axios.get(`${BASE_URL}/sales-admin/categories`, authHeader()),
  addCategory: (name) =>
    axios.post(`${BASE_URL}/sales-admin/categories`, { name }, authHeader()),
  deleteCategory: (id) =>
    axios.delete(`${BASE_URL}/sales-admin/categories/${id}`, authHeader()),
  getDriving: (u, y, m) =>
    axios.get(`${BASE_URL}/sales-admin/driving`, {
      ...authHeader(),
      params: { salesUsername: u, year: y, month: m },
    }),
  getDrivingDate: (u, date) =>
    axios.get(`${BASE_URL}/sales-admin/driving/date`, {
      ...authHeader(),
      params: { salesUsername: u, date },
    }),
  addDriving: (data) =>
    axios.post(`${BASE_URL}/sales-admin/driving`, data, authHeader()),
  updateDriving: (id, data) =>
    axios.put(`${BASE_URL}/sales-admin/driving/${id}`, data, authHeader()),
  deleteDriving: (id) =>
    axios.delete(`${BASE_URL}/sales-admin/driving/${id}`, authHeader()),
  getReceipts: (u, y, m) =>
    axios.get(`${BASE_URL}/sales-admin/receipt`, {
      ...authHeader(),
      params: { salesUsername: u, year: y, month: m },
    }),
  addReceipt: (data) =>
    axios.post(`${BASE_URL}/sales-admin/receipt`, data, authHeader()),
  updateReceipt: (id, data) =>
    axios.put(`${BASE_URL}/sales-admin/receipt/${id}`, data, authHeader()),
  deleteReceipt: (id) =>
    axios.delete(`${BASE_URL}/sales-admin/receipt/${id}`, authHeader()),
};

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtWon = (n) => fmt(n) + "원";
const pad2 = (n) => String(n).padStart(2, "0");
const TYPES = ["업무", "주유", "휴가"];
const TYPE_STYLE = {
  업무: { bg: "#e8f0fe", color: "#1557b0" },
  주유: { bg: "#fef3c7", color: "#92400e" },
  휴가: { bg: "#fce7f3", color: "#9d174d" },
};

// 월요일 기준 주 계산 유틸 (한국 달력 월~일)
const getWeeksOfMonth = (year, month) => {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let start = new Date(firstDay);
  const dow = start.getDay(); // 0=일, 1=월
  if (dow !== 1) {
    start.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));
  }
  let weekNum = 1;
  while (start <= lastDay) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const cs = start < firstDay ? new Date(firstDay) : new Date(start);
    const ce = end > lastDay ? new Date(lastDay) : new Date(end);
    const fmt2 = (d) => String(d).padStart(2, "0");
    weeks.push({
      weekNum,
      start: cs,
      end: ce,
      startStr: `${year}-${fmt2(cs.getMonth() + 1)}-${fmt2(cs.getDate())}`,
      endStr: `${year}-${fmt2(ce.getMonth() + 1)}-${fmt2(ce.getDate())}`,
      label: `${cs.getDate()}일~${ce.getDate()}일`,
    });
    start.setDate(start.getDate() + 7);
    weekNum++;
  }
  return weeks;
};

export default function SalesAdminContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mainTab, setMainTab] = useState("list");
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("driving");

  const [summary, setSummary] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [weekLocks, setWeekLocks] = useState({}); // { 1: true, 2: false, ... }
  const [monthDriving, setMonthDriving] = useState([]);
  const [dayDriving, setDayDriving] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    now.toISOString().split("T")[0],
  );
  const [prevMeter, setPrevMeter] = useState(0);
  const [lastMeter, setLastMeter] = useState(0);

  const [newCatName, setNewCatName] = useState("");

  const [showDrivingModal, setShowDrivingModal] = useState(false);
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
  const weeks = getWeeksOfMonth(year, month);

  // 오늘이 속한 주 번호 (이번 달 기준)
  const todayWeekNum = (() => {
    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD 로컬
    const todayDate = new Date(
      ...todayStr
        .split("-")
        .map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))),
    );
    for (const w of getWeeksOfMonth(year, month)) {
      if (todayDate >= w.start && todayDate <= w.end) return w.weekNum;
    }
    return -1;
  })();

  const activeCats = categories.filter((c) => c.active);
  const receiptBase = Number(receiptForm.amount || 0);
  const supplyPreview = receiptBase ? Math.round(receiptBase / 1.1) : 0;
  const vatPreview = receiptBase ? receiptBase - supplyPreview : 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const enteredDates = new Set(monthDriving.map((d) => d.date));
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
    let last = startMeter;
    return sorted.map((d) => {
      const meter = d.meterReading || 0;
      let dist = 0;
      if (meter > 0 && last > 0 && meter > last) dist = meter - last;
      if (meter > 0) last = meter;
      return { ...d, calcDist: dist };
    });
  };

  // 월 통계 계산
  const calcMonthStats = (driving) => {
    const calc = recalcDriving(driving);
    const totalDist = calc.reduce((s, d) => s + d.calcDist, 0);
    const totalFuelL = calc.reduce((s, d) => s + (d.fuelAmount || 0), 0);
    const totalFuelC = calc.reduce((s, d) => s + (d.fuelCost || 0), 0);
    const avgKmL = totalFuelL > 0 ? (totalDist / totalFuelL).toFixed(1) : "-";
    return { totalDist, totalFuelL, totalFuelC, avgKmL };
  };

  useEffect(() => {
    api
      .getCategories()
      .then((r) => setCategories(r.data))
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
      setWeekLocks(lock.data.weekLocks || {});
      setMonthDriving(drv.data);
      setReceipts(rec.data);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  const loadDay = async () => {
    try {
      const res = await api.getDrivingDate(selectedUser.username, selectedDate);
      setDayDriving(res.data);
      const todayMeters = res.data
        .map((d) => d.meterReading)
        .filter((m) => m > 0);
      setLastMeter(
        todayMeters.length > 0 ? Math.max(...todayMeters) : prevMeter,
      );
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
      setWeekLocks((prev) => ({ ...prev, [week.weekNum]: !currentLocked }));
      setSuccess(
        !currentLocked
          ? `🔒 ${user.name} ${week.label} 잠금`
          : `🔓 ${user.name} ${week.label} 잠금 해제`,
      );
      reloadSummary();
      // 상세뷰 lock status 재로드 (weekLocks 동기화)
      if (selectedUser?.username === user.username) {
        api.getLockStatus(user.username, year, month).then((r) => {
          setIsLocked(r.data.locked);
          setWeekLocks(r.data.weekLocks || {});
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
    setDrivingForm({
      date: selectedDate,
      type: "업무",
      destination: "",
      arrivalTime: "",
      meterReading: "",
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
      date: row.date,
      type: row.type,
      destination: row.destination,
      arrivalTime: row.arrivalTime,
      meterReading: row.meterReading || "",
      fuelAmount: row.fuelAmount || "",
      fuelCost: row.fuelCost || "",
      fuelUnitPrice: row.fuelUnitPrice || "",
    });
    setShowDrivingModal(true);
  };
  const handleSubmitDriving = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...drivingForm, salesUsername: selectedUser.username };
      if (editTarget) await api.updateDriving(editTarget.id, payload);
      else await api.addDriving(payload);
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
      <div className="gf-tab-bar" style={{ marginBottom: "16px" }}>
        <button
          className={`gf-tab ${mainTab === "list" ? "active" : ""}`}
          onClick={() => {
            setMainTab("list");
            setSelectedUser(null);
          }}
        >
          📊 정산 목록
        </button>
        <button
          className={`gf-tab ${mainTab === "total" ? "active" : ""}`}
          onClick={() => {
            setMainTab("total");
            setSelectedUser(null);
          }}
        >
          📈 전체 통계
        </button>
      </div>

      {error && (
        <div className="alert alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" onClick={() => setSuccess("")}>
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
        />
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
              // 해당 유저 운행 데이터로 통계 계산
              const userDriving = monthDriving.filter ? monthDriving : [];
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
                      setSelectedUser(u);
                      setSelectedDate(now.toISOString().split("T")[0]);
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
              }}
              style={outlineBtn}
            >
              ← 목록
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
            <div className="gf-tab-bar" style={{ marginBottom: 0 }}>
              <button
                className={`gf-tab ${activeTab === "driving" ? "active" : ""}`}
                onClick={() => setActiveTab("driving")}
              >
                📋 운행일지
              </button>
              <button
                className={`gf-tab ${activeTab === "receipt" ? "active" : ""}`}
                onClick={() => setActiveTab("receipt")}
              >
                💳 법인카드
              </button>
              <button
                className={`gf-tab ${activeTab === "category" ? "active" : ""}`}
                onClick={() => setActiveTab("category")}
              >
                🏷 카테고리
              </button>
              <button
                className={`gf-tab ${activeTab === "stats" ? "active" : ""}`}
                onClick={() => setActiveTab("stats")}
              >
                📊 통계
              </button>
            </div>
            <div style={{ marginLeft: "8px" }}>
              {!isLocked && activeTab === "driving" && (
                <button className="btn-primary" onClick={openDrivingAdd}>
                  ＋ 추가
                </button>
              )}
              {!isLocked && activeTab === "receipt" && (
                <button className="btn-primary" onClick={openReceiptAdd}>
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
                    const isT = d === now.toISOString().split("T")[0];
                    return (
                      <option key={d} value={d}>
                        {month}월 {day}일{isT ? " (오늘)" : ""}
                        {hasE ? " ●" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 당일 누계 */}
              {dayDriving.length > 0 &&
                (() => {
                  const calc = recalcDriving(dayDriving, prevMeter);
                  const meters = calc
                    .map((d) => d.meterReading)
                    .filter((m) => m > 0);
                  const endMeter = meters.length ? Math.max(...meters) : 0;
                  const totalKm = calc.reduce((s, d) => s + d.calcDist, 0);
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
                        marginBottom: "10px",
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
                            value: prevMeter > 0 ? `${fmt(prevMeter)}km` : "-",
                            color: "#555",
                          },
                          {
                            label: "금일누계",
                            value: totalKm > 0 ? `${fmt(totalKm)}km` : "-",
                            color: "#1557b0",
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
                        <th style={{ textAlign: "right" }}>주유량</th>
                        <th style={{ textAlign: "right" }}>주유금액</th>
                        <th style={{ textAlign: "right" }}>단가</th>
                        <th>구분</th>
                        {!isLocked && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const calc = recalcDriving(dayDriving, prevMeter);
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
                                    ⏰ {d.arrivalTime}
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
                  <button type="submit" className="btn-primary">
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
                              className="delete-btn"
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
            <div className="modal-bg" style={{ alignItems: "center" }}>
              <div
                className="modal"
                style={{ width: "480px", borderRadius: "14px" }}
              >
                <div className="modal-header">
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    운행일지 {editTarget ? "수정" : "추가"}
                  </h3>
                  <button
                    className="modal-close"
                    onClick={() => setShowDrivingModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmitDriving} className="modal-form">
                  <div className="field">
                    <label>날짜 *</label>
                    <input
                      type="date"
                      value={drivingForm.date || ""}
                      onChange={(e) =>
                        setDrivingForm((f) => ({ ...f, date: e.target.value }))
                      }
                      required
                    />
                  </div>

                  {/* 구분 */}
                  <div className="field">
                    <label>구분 *</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {TYPES.map((t) => {
                        const c = TYPE_STYLE[t];
                        const isActive = drivingForm.type === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              setDrivingForm((f) => ({
                                ...f,
                                type: t,
                                destination: "",
                                arrivalTime: "",
                                fuelAmount: "",
                                fuelCost: "",
                                fuelUnitPrice: "",
                              }))
                            }
                            style={{
                              flex: 1,
                              padding: "9px",
                              border: `1.5px solid ${isActive ? c.color : "#e0e0e0"}`,
                              borderRadius: "8px",
                              fontSize: "13px",
                              cursor: "pointer",
                              fontWeight: isActive ? 700 : 400,
                              background: isActive ? c.bg : "#fff",
                              color: isActive ? c.color : "#888",
                            }}
                          >
                            {t === "주유"
                              ? "⛽ "
                              : t === "휴가"
                                ? "🏖 "
                                : "💼 "}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {drivingForm.type === "업무" && (
                    <>
                      <div className="field">
                        <label
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#1557b0",
                          }}
                        >
                          🕐 도착 시간 *
                        </label>
                        <input
                          type="time"
                          value={drivingForm.arrivalTime || ""}
                          onChange={(e) =>
                            setDrivingForm((f) => ({
                              ...f,
                              arrivalTime: e.target.value,
                            }))
                          }
                          required
                          style={{
                            fontSize: "16px",
                            padding: "12px",
                            letterSpacing: "1px",
                          }}
                        />
                      </div>
                      <div className="field">
                        <label>도착지 *</label>
                        <input
                          type="text"
                          placeholder="경복궁"
                          value={drivingForm.destination || ""}
                          onChange={(e) =>
                            setDrivingForm((f) => ({
                              ...f,
                              destination: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </>
                  )}

                  {drivingForm.type !== "휴가" && (
                    <div className="field">
                      <label>
                        미터기 (km)
                        {drivingForm.type === "업무" ? " *" : " (선택)"}
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          placeholder="계량기 숫자"
                          value={drivingForm.meterReading || ""}
                          onChange={(e) =>
                            setDrivingForm((f) => ({
                              ...f,
                              meterReading: e.target.value,
                            }))
                          }
                          style={{ width: "100%", paddingRight: "40px" }}
                          required={drivingForm.type === "업무"}
                        />
                        <span style={unitSfx}>km</span>
                      </div>
                    </div>
                  )}

                  {drivingForm.type === "휴가" && (
                    <div className="field">
                      <label>미터기 (km) *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          placeholder="계량기 숫자"
                          value={drivingForm.meterReading || ""}
                          onChange={(e) =>
                            setDrivingForm((f) => ({
                              ...f,
                              meterReading: e.target.value,
                            }))
                          }
                          style={{ width: "100%", paddingRight: "40px" }}
                          required
                        />
                        <span style={unitSfx}>km</span>
                      </div>
                    </div>
                  )}

                  {(drivingForm.type === "주유" ||
                    drivingForm.type === "휴가") && (
                    <div
                      style={{
                        background:
                          drivingForm.type === "휴가" ? "#fce7f3" : "#fef3c7",
                        borderRadius: "8px",
                        padding: "12px",
                        border: `1px solid ${drivingForm.type === "휴가" ? "#f9a8d4" : "#fde68a"}`,
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color:
                            drivingForm.type === "휴가" ? "#9d174d" : "#92400e",
                          marginBottom: "10px",
                        }}
                      >
                        ⛽{" "}
                        {drivingForm.type === "휴가"
                          ? "개인 주유 (선택)"
                          : "주유 정보"}
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <div className="field">
                          <label>
                            {drivingForm.type === "주유"
                              ? "주유량 *"
                              : "주유량"}
                          </label>
                          <div style={{ position: "relative" }}>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="48.13"
                              value={drivingForm.fuelAmount || ""}
                              onChange={(e) =>
                                setDrivingForm((f) => ({
                                  ...f,
                                  fuelAmount: e.target.value,
                                }))
                              }
                              style={{ width: "100%", paddingRight: "24px" }}
                              required={drivingForm.type === "주유"}
                            />
                            <span style={{ ...unitSfx, fontSize: "11px" }}>
                              L
                            </span>
                          </div>
                        </div>
                        <div className="field">
                          <label>
                            {drivingForm.type === "주유"
                              ? "주유금액 *"
                              : "주유금액"}
                          </label>
                          <div style={{ position: "relative" }}>
                            <input
                              type="number"
                              placeholder="52000"
                              value={drivingForm.fuelCost || ""}
                              onChange={(e) =>
                                setDrivingForm((f) => ({
                                  ...f,
                                  fuelCost: e.target.value,
                                }))
                              }
                              style={{ width: "100%", paddingRight: "24px" }}
                              required={drivingForm.type === "주유"}
                            />
                            <span style={{ ...unitSfx, fontSize: "11px" }}>
                              원
                            </span>
                          </div>
                        </div>
                        <div className="field">
                          <label>
                            {drivingForm.type === "주유" ? "단가 *" : "단가"}
                          </label>
                          <div style={{ position: "relative" }}>
                            <input
                              type="number"
                              placeholder="1615"
                              value={drivingForm.fuelUnitPrice || ""}
                              onChange={(e) =>
                                setDrivingForm((f) => ({
                                  ...f,
                                  fuelUnitPrice: e.target.value,
                                }))
                              }
                              style={{ width: "100%", paddingRight: "24px" }}
                              required={drivingForm.type === "주유"}
                            />
                            <span style={{ ...unitSfx, fontSize: "11px" }}>
                              원
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && <p className="field-error">⚠ {error}</p>}
                  <div className="modal-btns">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setShowDrivingModal(false)}
                    >
                      취소
                    </button>
                    <button type="submit" className="btn-primary">
                      {editTarget ? "수정" : "추가"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 법인카드 모달 */}
          {showReceiptModal && (
            <div className="modal-bg" style={{ alignItems: "center" }}>
              <div
                className="modal"
                style={{ width: "440px", borderRadius: "14px" }}
              >
                <div className="modal-header">
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    지출내역 {editTarget ? "수정" : "추가"}
                  </h3>
                  <button
                    className="modal-close"
                    onClick={() => setShowReceiptModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmitReceipt} className="modal-form">
                  <div className="field">
                    <label>날짜</label>
                    <input
                      type="date"
                      value={receiptForm.date || ""}
                      onChange={(e) =>
                        setReceiptForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>카테고리</label>
                    <select
                      value={receiptForm.category || ""}
                      onChange={(e) =>
                        setReceiptForm((f) => ({
                          ...f,
                          category: e.target.value,
                        }))
                      }
                    >
                      {activeCats.length === 0 ? (
                        <option value="">없음</option>
                      ) : (
                        activeCats.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="field">
                    <label>신용카드 번호</label>
                    <input
                      type="text"
                      value={receiptForm.content || ""}
                      onChange={(e) =>
                        setReceiptForm((f) => ({
                          ...f,
                          content: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>총금액 *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        value={receiptForm.amount || ""}
                        onChange={(e) =>
                          setReceiptForm((f) => ({
                            ...f,
                            amount: e.target.value,
                          }))
                        }
                        style={{ width: "100%", paddingRight: "36px" }}
                        required
                      />
                      <span style={unitSfx}>원</span>
                    </div>
                  </div>
                  {receiptBase > 0 && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        fontSize: "13px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ color: "#555" }}>공급가액</span>
                        <strong style={{ color: "#1557b0" }}>
                          {fmtWon(supplyPreview)}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#555" }}>VAT 10%</span>
                        <strong style={{ color: "#059669" }}>
                          {fmtWon(vatPreview)}
                        </strong>
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label>
                      사업자번호{" "}
                      <span
                        style={{
                          color: "#aaa",
                          fontSize: "11px",
                          fontWeight: 400,
                        }}
                      >
                        (선택)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="000-00-00000"
                      value={receiptForm.businessNumber || ""}
                      onChange={(e) =>
                        setReceiptForm((f) => ({
                          ...f,
                          businessNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>
                      상호{" "}
                      <span
                        style={{
                          color: "#aaa",
                          fontSize: "11px",
                          fontWeight: 400,
                        }}
                      >
                        (선택)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={receiptForm.companyName || ""}
                      onChange={(e) =>
                        setReceiptForm((f) => ({
                          ...f,
                          companyName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {error && <p className="field-error">⚠ {error}</p>}
                  <div className="modal-btns">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setShowReceiptModal(false)}
                    >
                      취소
                    </button>
                    <button type="submit" className="btn-primary">
                      {editTarget ? "수정" : "추가"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
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

// ──── 전체 통계 컴포넌트 ────
function InfoRow({ label, value, color }) {
  return (
    <div style={{ fontSize: "12px" }}>
      <span style={{ color: "#aaa", marginRight: "4px" }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || "#1a1a2e" }}>
        {value}
      </span>
    </div>
  );
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
const unitSfx = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "13px",
  color: "#888",
  fontWeight: 600,
  pointerEvents: "none",
};
