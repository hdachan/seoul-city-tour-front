import { useEffect, useState, useRef } from "react";
import {
  fetchSalesUserList,
  fetchSalesAdminSummary,
  fetchSalesAdminLockStatus,
  toggleSalesMonthLock,
  fetchAdminReceipts,
  addAdminReceipt,
  updateAdminReceipt,
  deleteAdminReceipt,
  fetchAdminDriving,
  addAdminDriving,
  updateAdminDriving,
  deleteAdminDriving,
} from "../../api/auth";
import axios from "axios";

const BASE_URL = "http://localhost:8080/api";
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const fetchAdminCategories = () =>
  axios.get(`${BASE_URL}/sales-admin/categories`, authHeader());
const addAdminCategory = (name, unit) =>
  axios.post(
    `${BASE_URL}/sales-admin/categories`,
    { name, unit },
    authHeader(),
  );
const deleteAdminCategory = (id) =>
  axios.delete(`${BASE_URL}/sales-admin/categories/${id}`, authHeader());
const fetchAdminCash = (u, y, m) =>
  axios.get(`${BASE_URL}/sales-admin/cash`, {
    ...authHeader(),
    params: { salesUsername: u, year: y, month: m },
  });
const addAdminCash = (data) =>
  axios.post(`${BASE_URL}/sales-admin/cash`, data, authHeader());
const updateAdminCash = (id, data) =>
  axios.put(`${BASE_URL}/sales-admin/cash/${id}`, data, authHeader());
const deleteAdminCash = (id) =>
  axios.delete(`${BASE_URL}/sales-admin/cash/${id}`, authHeader());

const fmt = (n) => Number(n || 0).toLocaleString() + "원";

export default function SalesAdminContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mainTab, setMainTab] = useState("list");

  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [drivings, setDrivings] = useState([]);
  const [cashes, setCashes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("receipt");
  const [newCatName, setNewCatName] = useState("");
  const [newCatUnit, setNewCatUnit] = useState("원");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [receiptModal, setReceiptModal] = useState({ mode: null, data: null });
  const [drivingModal, setDrivingModal] = useState({ mode: null, data: null });
  const [cashModal, setCashModal] = useState({ mode: null, data: null });
  const [receiptForm, setReceiptForm] = useState({});
  const [drivingForm, setDrivingForm] = useState({});
  const [cashForm, setCashForm] = useState({});

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const minDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const maxDate = new Date(year, month, 0).toISOString().split("T")[0];
  const defaultDate = () =>
    year === now.getFullYear() && month === now.getMonth() + 1
      ? now.toISOString().split("T")[0]
      : minDate;

  // 선택된 카테고리 unit
  const selectedUnit =
    categories.find((c) => c.name === receiptForm.category)?.unit || "원";
  const isLUnit = selectedUnit === "L";
  const cashSelectedUnit =
    categories.find((c) => c.name === cashForm.category)?.unit || "원";
  const isCashLUnit = cashSelectedUnit === "L";

  const previewSupply = (t) => (t ? Math.round(Number(t) / 1.1) : 0);
  const previewVat = (t) => (t ? Number(t) - previewSupply(t) : 0);
  const priceBase = isLUnit ? receiptForm.totalAmount : receiptForm.amount;
  const cashPriceBase = isCashLUnit ? cashForm.totalAmount : cashForm.amount;

  const activeCats = categories.filter((c) => c.active);

  useEffect(() => {
    fetchSalesUserList()
      .then((r) => setUsers(r.data))
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetchAdminCategories()
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (users.length)
      fetchSalesAdminSummary(year, month)
        .then((r) => setSummary(r.data))
        .catch(() => {});
  }, [users, year, month]);
  useEffect(() => {
    if (selectedUser) loadDetail();
  }, [selectedUser, year, month]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadDetail = async () => {
    try {
      const [lock, r, d, ca] = await Promise.all([
        fetchSalesAdminLockStatus(selectedUser.username, year, month),
        fetchAdminReceipts(selectedUser.username, year, month),
        fetchAdminDriving(selectedUser.username, year, month),
        fetchAdminCash(selectedUser.username, year, month),
      ]);
      setIsLocked(lock.data.locked);
      setReceipts(r.data);
      setDrivings(d.data);
      setCashes(ca.data);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  const reloadSummary = () =>
    fetchSalesAdminSummary(year, month)
      .then((r) => setSummary(r.data))
      .catch(() => {});

  const handleToggleLock = async (user, currentLocked) => {
    try {
      await toggleSalesMonthLock(user.username, year, month, !currentLocked);
      if (selectedUser?.username === user.username) setIsLocked(!currentLocked);
      setSuccess(
        !currentLocked
          ? `🔒 ${user.name} ${month}월 완료!`
          : `🔓 ${user.name} ${month}월 잠금 해제`,
      );
      reloadSummary();
    } catch {
      setError("변경 실패");
    }
  };

  // 카테고리
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setError("");
    if (!newCatName.trim()) {
      setError("카테고리 이름을 입력해주세요.");
      return;
    }
    try {
      await addAdminCategory(newCatName.trim(), newCatUnit);
      setNewCatName("");
      setNewCatUnit("원");
      setSuccess("카테고리가 추가되었습니다.");
      fetchAdminCategories().then((r) => setCategories(r.data));
    } catch (err) {
      setError(err.response?.data?.error || "추가 실패");
    }
  };
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteAdminCategory(id);
      setSuccess("삭제되었습니다.");
      fetchAdminCategories().then((r) => setCategories(r.data));
    } catch {
      setError("삭제 실패");
    }
  };

  // 법인카드
  const openReceiptAdd = () => {
    setError("");
    const firstCat = activeCats[0];
    setReceiptForm({
      date: defaultDate(),
      category: firstCat?.name || "",
      content: "",
      amount: "",
      totalAmount: "",
      businessNumber: "",
      companyName: "",
    });
    setReceiptModal({ mode: "add" });
  };
  const openReceiptEdit = (row) => {
    setError("");
    setOpenMenu(null);
    setReceiptForm({
      date: row.date,
      category: row.category,
      content: row.content,
      amount: row.amount || "",
      totalAmount: row.totalAmount || "",
      businessNumber: row.businessNumber,
      companyName: row.companyName,
    });
    setReceiptModal({ mode: "edit", data: row });
  };
  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    setError("");
    if (!receiptForm.category) {
      setError("카테고리를 선택해주세요.");
      return;
    }
    const payload = {
      ...receiptForm,
      unit: selectedUnit,
      salesUsername: selectedUser.username,
    };
    try {
      if (receiptModal.mode === "add") {
        await addAdminReceipt(payload);
        setSuccess("추가되었습니다.");
      } else {
        await updateAdminReceipt(receiptModal.data.id, payload);
        setSuccess("수정되었습니다.");
      }
      setReceiptModal({ mode: null });
      loadDetail();
      reloadSummary();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteReceipt = async (id) => {
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteAdminReceipt(id);
      loadDetail();
      reloadSummary();
    } catch {
      setError("삭제 실패");
    }
  };

  // 운행내역
  const openDrivingAdd = () => {
    setError("");
    setDrivingForm({
      date: defaultDate(),
      totalFuelDetail: "",
      averageDistance: "",
      totalFuelCost: "",
    });
    setDrivingModal({ mode: "add" });
  };
  const openDrivingEdit = (row) => {
    setError("");
    setOpenMenu(null);
    setDrivingForm({
      date: row.date || defaultDate(),
      totalFuelDetail: row.totalFuelDetail,
      averageDistance: row.averageDistance,
      totalFuelCost: row.totalFuelCost,
    });
    setDrivingModal({ mode: "edit", data: row });
  };
  const handleSubmitDriving = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (drivingModal.mode === "add") {
        await addAdminDriving({
          ...drivingForm,
          salesUsername: selectedUser.username,
        });
        setSuccess("추가되었습니다.");
      } else {
        await updateAdminDriving(drivingModal.data.id, drivingForm);
        setSuccess("수정되었습니다.");
      }
      setDrivingModal({ mode: null });
      loadDetail();
      reloadSummary();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteDriving = async (id) => {
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteAdminDriving(id);
      loadDetail();
      reloadSummary();
    } catch {
      setError("삭제 실패");
    }
  };

  // 현금
  const openCashAdd = () => {
    setError("");
    const firstCat = activeCats[0];
    setCashForm({
      date: defaultDate(),
      type: "지출",
      paymentType: "현금",
      category: firstCat?.name || "",
      content: "",
      amount: "",
      totalAmount: "",
      companyName: "",
    });
    setCashModal({ mode: "add" });
  };
  const openCashEdit = (row) => {
    setError("");
    setOpenMenu(null);
    setCashForm({
      date: row.date,
      type: row.type,
      paymentType: row.paymentType || "현금",
      category: row.category,
      content: row.content,
      amount: row.amount || "",
      totalAmount: row.totalAmount || "",
      companyName: row.companyName,
    });
    setCashModal({ mode: "edit", data: row });
  };
  const handleSubmitCash = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      ...cashForm,
      unit: cashSelectedUnit,
      salesUsername: selectedUser.username,
    };
    try {
      if (cashModal.mode === "add") {
        await addAdminCash(payload);
        setSuccess("추가되었습니다.");
      } else {
        await updateAdminCash(cashModal.data.id, payload);
        setSuccess("수정되었습니다.");
      }
      setCashModal({ mode: null });
      loadDetail();
      reloadSummary();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteCash = async (id) => {
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteAdminCash(id);
      loadDetail();
      reloadSummary();
    } catch {
      setError("삭제 실패");
    }
  };

  const DotMenu = ({ id, onEdit, onDelete }) => (
    <div
      style={{ position: "relative" }}
      ref={openMenu === id ? menuRef : null}
    >
      <button
        onClick={() => setOpenMenu(openMenu === id ? null : id)}
        style={dotBtnStyle}
      >
        ···
      </button>
      {openMenu === id && (
        <div style={dropdownStyle}>
          <button onClick={onEdit} style={menuItemStyle}>
            수정
          </button>
          <button
            onClick={onDelete}
            style={{ ...menuItemStyle, color: "#dc2626" }}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );

  const FilterBar = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "1.2rem",
        background: "#fff",
        padding: "10px 14px",
        borderRadius: "14px",
        border: "1px solid #e4e8f0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {selectedUser && (
        <button
          onClick={() => setSelectedUser(null)}
          style={{
            ...outlineBtnStyle,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#4a6cf7",
            borderColor: "#c7d2fe",
            background: "#eef2ff",
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>←</span> 목록
        </button>
      )}
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
      {selectedUser && (
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#1a1a2e",
            background: "#f4f6fb",
            padding: "5px 12px",
            borderRadius: "8px",
            border: "1px solid #e4e8f0",
          }}
        >
          👤 {selectedUser.name}
        </span>
      )}
      {selectedUser && (
        <button
          onClick={() => handleToggleLock(selectedUser, isLocked)}
          style={{
            marginLeft: "auto",
            padding: "7px 16px",
            border: "1.5px solid",
            borderRadius: "9px",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: 700,
            background: isLocked ? "#f0fdf4" : "#fafafa",
            color: isLocked ? "#16a34a" : "#9ca3af",
            borderColor: isLocked ? "#86efac" : "#e5e7eb",
          }}
        >
          {isLocked ? "✅ 정산 완료" : "⏳ 진행중"}
        </button>
      )}
    </div>
  );

  const DateField = ({ value, onChange }) => (
    <div className="field">
      <label>
        날짜 * ({year}년 {month}월)
      </label>
      <input
        type="date"
        min={minDate}
        max={maxDate}
        value={value || defaultDate()}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  return (
    <div>
      {/* 메인 탭 */}
      <div className="gf-tab-bar" style={{ marginBottom: "18px" }}>
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
          className={`gf-tab ${mainTab === "category" ? "active" : ""}`}
          onClick={() => setMainTab("category")}
        >
          🏷 카테고리 관리
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

      {/* 카테고리 관리 */}
      {mainTab === "category" && (
        <div>
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e4e8f0",
              padding: "20px",
              marginBottom: "14px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 700,
                marginBottom: "14px",
                color: "#1a1a2e",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  background: "#eef2ff",
                  color: "#4a6cf7",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                +
              </span>{" "}
              카테고리 추가
            </h3>
            <form
              onSubmit={handleAddCategory}
              style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
            >
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="카테고리 이름 (예: 식비, 교통비, 주유)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1.5px solid #d8dce3",
                    borderRadius: "9px",
                    fontSize: "13px",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                />
              </div>
              {/* 단위 선택 */}
              <div style={{ display: "flex", gap: "6px" }}>
                {["원", "L"].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setNewCatUnit(u)}
                    style={{
                      padding: "9px 16px",
                      border: "1.5px solid",
                      borderRadius: "9px",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: newCatUnit === u ? 700 : 400,
                      background:
                        newCatUnit === u
                          ? u === "L"
                            ? "#fef3c7"
                            : "#eef2ff"
                          : "#fff",
                      color:
                        newCatUnit === u
                          ? u === "L"
                            ? "#92400e"
                            : "#4a6cf7"
                          : "#9ca3af",
                      borderColor:
                        newCatUnit === u
                          ? u === "L"
                            ? "#fcd34d"
                            : "#a5b4fc"
                          : "#e5e7eb",
                      transition: "all 0.15s",
                    }}
                  >
                    {u === "L" ? "⛽ L" : "💰 원"}
                  </button>
                ))}
              </div>
              <button type="submit" className="btn-primary">
                추가
              </button>
            </form>
            <p
              style={{
                fontSize: "11px",
                color: "#9ca3af",
                marginTop: "10px",
                background: "#f8f9fc",
                padding: "7px 10px",
                borderRadius: "7px",
              }}
            >
              💰 원 = 금액(공급가액/VAT 자동계산) · ⛽ L = 주유량(리터)
            </p>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e4e8f0",
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f4f6fb",
                    borderBottom: "2px solid #e4e8f0",
                  }}
                >
                  <th style={thS}>카테고리명</th>
                  <th style={thS}>단위</th>
                  <th style={thS}>상태</th>
                  <th style={{ ...thS, width: "80px" }}></th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "#c4c9d4",
                        fontSize: "13px",
                      }}
                    >
                      등록된 카테고리가 없습니다.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                    <tr
                      key={c.id}
                      style={{
                        borderTop: "1px solid #f0f2f7",
                        transition: "background 0.1s",
                      }}
                    >
                      <td style={{ ...tdS, fontWeight: 600, color: "#1a1a2e" }}>
                        {c.name}
                      </td>
                      <td style={tdS}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "99px",
                            background: c.unit === "L" ? "#fef3c7" : "#eef2ff",
                            color: c.unit === "L" ? "#92400e" : "#4a6cf7",
                          }}
                        >
                          {c.unit === "L" ? "⛽ L" : "💰 원"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 9px",
                            borderRadius: "99px",
                            background: c.active ? "#f0fdf4" : "#f4f6fb",
                            color: c.active ? "#16a34a" : "#9ca3af",
                            fontWeight: 700,
                            border: `1px solid ${c.active ? "#bbf7d0" : "#e5e7eb"}`,
                          }}
                        >
                          {c.active ? "● 활성" : "○ 비활성"}
                        </span>
                      </td>
                      <td style={tdS}>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="delete-btn"
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

      {/* 카드뷰 */}
      {mainTab === "list" && !selectedUser && (
        <div>
          <FilterBar />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {summary.map((u) => (
              <div
                key={u.username}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "1.3rem",
                  border: `2px solid ${u.locked ? "#bbf7d0" : u.hasData ? "#c7d2fe" : "#e4e8f0"}`,
                  transition: "all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.06)";
                }}
              >
                <div
                  onClick={() =>
                    setSelectedUser({ username: u.username, name: u.name })
                  }
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      marginBottom: "12px",
                      color: "#1a1a2e",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: u.locked ? "#f0fdf4" : "#eef2ff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                      }}
                    >
                      {u.locked ? "✅" : "👤"}
                    </span>
                    {u.name}
                  </div>
                  {u.hasData ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        marginBottom: "14px",
                      }}
                    >
                      <CountRow
                        label="법인카드"
                        count={u.receiptCount}
                        color="#4a6cf7"
                      />
                      <CountRow
                        label="운행내역"
                        count={u.drivingCount}
                        color="#059669"
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        marginBottom: "14px",
                        padding: "10px",
                        background: "#fffbeb",
                        borderRadius: "9px",
                        textAlign: "center",
                        fontSize: "12px",
                        color: "#92400e",
                        fontWeight: 600,
                        border: "1px solid #fde68a",
                      }}
                    >
                      ✏️ 아직 입력 없음
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLock(u, u.locked);
                  }}
                  style={{
                    width: "100%",
                    padding: "9px",
                    border: "1.5px solid",
                    borderRadius: "9px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: 700,
                    background: u.locked ? "#f0fdf4" : "#f4f6fb",
                    color: u.locked ? "#16a34a" : "#9ca3af",
                    borderColor: u.locked ? "#86efac" : "#e5e7eb",
                    transition: "all 0.15s",
                  }}
                >
                  {u.locked ? "✅ 정산 완료" : "⏳ 진행중"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 상세뷰 */}
      {mainTab === "list" && selectedUser && (
        <div>
          <FilterBar />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "1rem",
              padding: "11px 16px",
              background: isLocked ? "#f0fdf4" : "#fffbeb",
              border: `1.5px solid ${isLocked ? "#86efac" : "#fde68a"}`,
              borderRadius: "10px",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: isLocked ? "#16a34a" : "#92400e",
              }}
            >
              {isLocked ? "✅ 정산 완료된 달입니다." : "⏳ 정산 진행 중입니다."}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <div className="gf-tab-bar" style={{ marginBottom: 0, flex: 1 }}>
              <button
                className={`gf-tab ${activeTab === "receipt" ? "active" : ""}`}
                onClick={() => setActiveTab("receipt")}
              >
                법인카드(지출) <span style={countBadge}>{receipts.length}</span>
              </button>
              <button
                className={`gf-tab ${activeTab === "driving" ? "active" : ""}`}
                onClick={() => setActiveTab("driving")}
              >
                운행내역 <span style={countBadge}>{drivings.length}</span>
              </button>
              <button
                className={`gf-tab ${activeTab === "cash" ? "active" : ""}`}
                onClick={() => setActiveTab("cash")}
              >
                현금 <span style={countBadge}>{cashes.length}</span>
              </button>
            </div>
            <div style={{ paddingLeft: "12px" }}>
              {activeTab === "receipt" && (
                <button className="btn-primary" onClick={openReceiptAdd}>
                  ＋ 추가
                </button>
              )}
              {activeTab === "driving" && (
                <button className="btn-primary" onClick={openDrivingAdd}>
                  ＋ 추가
                </button>
              )}
              {activeTab === "cash" && (
                <button className="btn-primary" onClick={openCashAdd}>
                  ＋ 추가
                </button>
              )}
            </div>
          </div>

          {/* 법인카드 테이블 */}
          {activeTab === "receipt" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                border: "1px solid #e4e8f0",
                overflow: "visible",
                marginTop: "6px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "92px" }} />
                  <col style={{ width: "90px" }} />
                  <col />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "44px" }} />
                </colgroup>
                <thead>
                  <tr
                    style={{
                      background: "#f4f6fb",
                      borderBottom: "2px solid #e4e8f0",
                    }}
                  >
                    <th style={thS}>날짜</th>
                    <th style={thS}>카테고리</th>
                    <th style={thS}>내용</th>
                    <th style={{ ...thS, textAlign: "right" }}>금액</th>
                    <th style={{ ...thS, textAlign: "right" }}>공급가액</th>
                    <th style={{ ...thS, textAlign: "right" }}>VAT(10%)</th>
                    <th style={thS}>사업자번호</th>
                    <th style={thS}>상호</th>
                    <th style={thS}></th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          padding: "3rem",
                          color: "#c4c9d4",
                          fontSize: "13px",
                        }}
                      >
                        내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid #f0f2f7",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8f9fc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "")
                        }
                      >
                        <td style={tdS}>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#9ca3af",
                              fontWeight: 500,
                            }}
                          >
                            {r.date}
                          </span>
                        </td>
                        <td style={tdS}>
                          {r.category ? (
                            <span style={catBadge}>
                              {r.category}
                              {r.unit === "L" && (
                                <span
                                  style={{
                                    marginLeft: "3px",
                                    fontSize: "10px",
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    padding: "1px 4px",
                                    borderRadius: "3px",
                                  }}
                                >
                                  L
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: "#ccc" }}>-</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.content || "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            fontWeight: 600,
                            color: r.unit === "L" ? "#92400e" : "#4a6cf7",
                          }}
                        >
                          {r.unit === "L"
                            ? r.amount
                              ? `${r.amount}L`
                              : "-"
                            : r.totalAmount
                              ? fmt(r.totalAmount)
                              : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            color: "#6b7280",
                            fontSize: "12px",
                          }}
                        >
                          {r.unit !== "L" && r.supplyAmount
                            ? fmt(r.supplyAmount)
                            : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            color: "#059669",
                            fontSize: "12px",
                          }}
                        >
                          {r.unit !== "L" && r.vat ? fmt(r.vat) : "-"}
                        </td>
                        <td
                          style={{ ...tdS, fontSize: "12px", color: "#9ca3af" }}
                        >
                          {r.businessNumber || "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            fontSize: "12px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.companyName || "-"}
                        </td>
                        <td style={{ ...tdS, position: "relative" }}>
                          <DotMenu
                            id={`r-${r.id}`}
                            onEdit={() => openReceiptEdit(r)}
                            onDelete={() => handleDeleteReceipt(r.id)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {receipts.length > 0 && (
                  <tfoot>
                    <tr
                      style={{
                        background: "#eef2ff",
                        borderTop: "2px solid #c7d2fe",
                      }}
                    >
                      <td
                        colSpan={3}
                        style={{ ...tdS, fontWeight: 700, color: "#4a6cf7" }}
                      >
                        합계
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#4a6cf7",
                        }}
                      >
                        {fmt(
                          receipts
                            .filter((r) => r.unit !== "L")
                            .reduce((s, r) => s + (r.totalAmount || 0), 0),
                        )}
                        {receipts.some((r) => r.unit === "L") && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#92400e",
                              fontWeight: 600,
                            }}
                          >
                            +
                            {receipts
                              .filter((r) => r.unit === "L")
                              .reduce((s, r) => s + (r.amount || 0), 0)}
                            L
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          color: "#555",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(
                          receipts.reduce(
                            (s, r) => s + (r.supplyAmount || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          color: "#059669",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(receipts.reduce((s, r) => s + (r.vat || 0), 0))}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 운행내역 테이블 */}
          {activeTab === "driving" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                border: "1px solid #e4e8f0",
                overflow: "visible",
                marginTop: "6px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f4f6fb",
                      borderBottom: "2px solid #e4e8f0",
                    }}
                  >
                    <th style={thS}>날짜</th>
                    <th style={thS}>총주유내역</th>
                    <th style={{ ...thS, textAlign: "center" }}>평균거리</th>
                    <th style={{ ...thS, textAlign: "right" }}>총주유금액</th>
                    <th style={{ ...thS, width: "44px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {drivings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: "3rem",
                          color: "#c4c9d4",
                          fontSize: "13px",
                        }}
                      >
                        내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    drivings.map((d) => (
                      <tr
                        key={d.id}
                        style={{
                          borderBottom: "1px solid #f0f2f7",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8f9fc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "")
                        }
                      >
                        <td style={tdS}>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#9ca3af",
                              fontWeight: 500,
                            }}
                          >
                            {d.date || "-"}
                          </span>
                        </td>
                        <td style={tdS}>{d.totalFuelDetail || "-"}</td>
                        <td
                          style={{ ...tdS, textAlign: "center", color: "#555" }}
                        >
                          {d.averageDistance ? `${d.averageDistance}km` : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            fontWeight: 600,
                            color: "#4a6cf7",
                          }}
                        >
                          {d.totalFuelCost ? fmt(d.totalFuelCost) : "-"}
                        </td>
                        <td style={{ ...tdS, position: "relative" }}>
                          <DotMenu
                            id={`d-${d.id}`}
                            onEdit={() => openDrivingEdit(d)}
                            onDelete={() => handleDeleteDriving(d.id)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 현금 탭 */}
          {activeTab === "cash" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                border: "1px solid #e4e8f0",
                overflow: "visible",
                marginTop: "6px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "92px" }} />
                  <col style={{ width: "70px" }} />
                  <col style={{ width: "70px" }} />
                  <col style={{ width: "90px" }} />
                  <col />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "44px" }} />
                </colgroup>
                <thead>
                  <tr
                    style={{
                      background: "#f4f6fb",
                      borderBottom: "2px solid #e4e8f0",
                    }}
                  >
                    <th style={thS}>날짜</th>
                    <th style={thS}>구분</th>
                    <th style={thS}>결제수단</th>
                    <th style={thS}>카테고리</th>
                    <th style={thS}>내용</th>
                    <th style={{ ...thS, textAlign: "right" }}>금액</th>
                    <th style={{ ...thS, textAlign: "right" }}>공급가액</th>
                    <th style={{ ...thS, textAlign: "right" }}>VAT(10%)</th>
                    <th style={thS}>상호</th>
                    <th style={thS}></th>
                  </tr>
                </thead>
                <tbody>
                  {cashes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          textAlign: "center",
                          padding: "3rem",
                          color: "#c4c9d4",
                          fontSize: "13px",
                        }}
                      >
                        현금 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    cashes.map((c) => (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: "1px solid #f0f2f7",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8f9fc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "")
                        }
                      >
                        <td style={tdS}>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#9ca3af",
                              fontWeight: 500,
                            }}
                          >
                            {c.date}
                          </span>
                        </td>
                        <td style={tdS}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "99px",
                              background:
                                c.type === "수입" ? "#f0fdf4" : "#fef2f2",
                              color: c.type === "수입" ? "#16a34a" : "#dc2626",
                              border: `1px solid ${c.type === "수입" ? "#bbf7d0" : "#fecaca"}`,
                            }}
                          >
                            {c.type}
                          </span>
                        </td>
                        <td style={tdS}>
                          {c.type === "수입" && c.paymentType ? (
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 7px",
                                borderRadius: "99px",
                                background: "#eef2ff",
                                color: "#4a6cf7",
                                fontWeight: 600,
                                border: "1px solid #c7d2fe",
                              }}
                            >
                              {c.paymentType}
                            </span>
                          ) : (
                            <span
                              style={{ color: "#d1d5db", fontSize: "12px" }}
                            >
                              -
                            </span>
                          )}
                        </td>
                        <td style={tdS}>
                          {c.category ? (
                            <span style={catBadge}>{c.category}</span>
                          ) : (
                            <span style={{ color: "#ccc" }}>-</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.content || "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            fontWeight: 600,
                            color:
                              c.unit === "L"
                                ? "#92400e"
                                : c.type === "수입"
                                  ? "#16a34a"
                                  : "#4a6cf7",
                          }}
                        >
                          {c.unit === "L"
                            ? `${c.amount}L / ${fmt(c.totalAmount)}`
                            : c.totalAmount
                              ? fmt(c.totalAmount)
                              : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            color: "#555",
                            fontSize: "12px",
                          }}
                        >
                          {c.supplyAmount ? fmt(c.supplyAmount) : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            color: "#059669",
                            fontSize: "12px",
                          }}
                        >
                          {c.vat ? fmt(c.vat) : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            fontSize: "12px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.companyName || "-"}
                        </td>
                        <td style={{ ...tdS, position: "relative" }}>
                          <DotMenu
                            id={`c-${c.id}`}
                            onEdit={() => openCashEdit(c)}
                            onDelete={() => handleDeleteCash(c.id)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {cashes.length > 0 && (
                  <tfoot>
                    <tr
                      style={{
                        background: "#eef2ff",
                        borderTop: "2px solid #c7d2fe",
                      }}
                    >
                      <td
                        colSpan={5}
                        style={{ ...tdS, fontWeight: 700, color: "#4a6cf7" }}
                      >
                        합계
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#4a6cf7",
                        }}
                      >
                        {fmt(
                          cashes.reduce((s, c) => s + (c.totalAmount || 0), 0),
                        )}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          color: "#555",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(
                          cashes.reduce((s, c) => s + (c.supplyAmount || 0), 0),
                        )}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          color: "#059669",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(cashes.reduce((s, c) => s + (c.vat || 0), 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 현금 모달 */}
          {cashModal.mode && (
            <div className="modal-bg">
              <div className="modal">
                <div className="modal-header">
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    현금 {cashModal.mode === "add" ? "추가" : "수정"}
                  </h3>
                  <button
                    className="modal-close"
                    onClick={() => setCashModal({ mode: null })}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmitCash} className="modal-form">
                  <DateField
                    value={cashForm.date}
                    onChange={(v) => setCashForm((f) => ({ ...f, date: v }))}
                  />
                  <div className="field">
                    <label>구분 *</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {["지출", "수입"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setCashForm((f) => ({
                              ...f,
                              type: t,
                              paymentType: t === "수입" ? "현금" : "",
                            }))
                          }
                          style={{
                            flex: 1,
                            padding: "10px",
                            border: "1.5px solid",
                            borderRadius: "9px",
                            fontSize: "13px",
                            cursor: "pointer",
                            fontWeight: cashForm.type === t ? 700 : 400,
                            background:
                              cashForm.type === t
                                ? t === "수입"
                                  ? "#f0fdf4"
                                  : "#fef2f2"
                                : "#fff",
                            color:
                              cashForm.type === t
                                ? t === "수입"
                                  ? "#16a34a"
                                  : "#dc2626"
                                : "#9ca3af",
                            borderColor:
                              cashForm.type === t
                                ? t === "수입"
                                  ? "#86efac"
                                  : "#fca5a5"
                                : "#e5e7eb",
                            transition: "all 0.15s",
                          }}
                        >
                          {t === "수입" ? "📈 수입" : "📉 지출"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {cashForm.type === "수입" && (
                    <div className="field">
                      <label>결제수단 *</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {["카드", "현금", "기타"].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setCashForm((f) => ({ ...f, paymentType: p }))
                            }
                            style={{
                              flex: 1,
                              padding: "9px",
                              border: "1.5px solid",
                              borderRadius: "9px",
                              fontSize: "13px",
                              cursor: "pointer",
                              fontWeight:
                                cashForm.paymentType === p ? 700 : 400,
                              background:
                                cashForm.paymentType === p ? "#eef2ff" : "#fff",
                              color:
                                cashForm.paymentType === p
                                  ? "#4a6cf7"
                                  : "#9ca3af",
                              borderColor:
                                cashForm.paymentType === p
                                  ? "#a5b4fc"
                                  : "#e5e7eb",
                              transition: "all 0.15s",
                            }}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label>카테고리</label>
                    <select
                      value={cashForm.category || ""}
                      onChange={(e) =>
                        setCashForm((f) => ({
                          ...f,
                          category: e.target.value,
                          amount: "",
                          totalAmount: "",
                        }))
                      }
                    >
                      <option value="">선택 안함</option>
                      {activeCats.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                          {c.unit === "L" ? " (L)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>내용</label>
                    <input
                      type="text"
                      value={cashForm.content || ""}
                      onChange={(e) =>
                        setCashForm((f) => ({ ...f, content: e.target.value }))
                      }
                    />
                  </div>
                  {isCashLUnit ? (
                    <>
                      <div className="field">
                        <label>주유량 (L) *</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="예: 45.5"
                            value={cashForm.amount || ""}
                            onChange={(e) =>
                              setCashForm((f) => ({
                                ...f,
                                amount: e.target.value,
                              }))
                            }
                            style={{ width: "100%", paddingRight: "36px" }}
                            required
                          />
                          <span style={unitSuffix}>L</span>
                        </div>
                      </div>
                      <div className="field">
                        <label>금액 *</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            step="1"
                            value={cashForm.totalAmount || ""}
                            onChange={(e) =>
                              setCashForm((f) => ({
                                ...f,
                                totalAmount: e.target.value,
                              }))
                            }
                            style={{ width: "100%", paddingRight: "36px" }}
                            required
                          />
                          <span style={unitSuffix}>원</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="field">
                      <label>금액 *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          step="1"
                          value={cashForm.amount || ""}
                          onChange={(e) =>
                            setCashForm((f) => ({
                              ...f,
                              amount: e.target.value,
                            }))
                          }
                          style={{ width: "100%", paddingRight: "36px" }}
                          required
                        />
                        <span style={unitSuffix}>원</span>
                      </div>
                    </div>
                  )}
                  {Number(cashPriceBase) > 0 && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "9px",
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
                        <span style={{ color: "#6b7280" }}>
                          공급가액 (자동)
                        </span>
                        <strong style={{ color: "#4a6cf7" }}>
                          {previewSupply(cashPriceBase).toLocaleString()}원
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>VAT 10% (자동)</span>
                        <strong style={{ color: "#059669" }}>
                          {previewVat(cashPriceBase).toLocaleString()}원
                        </strong>
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label>
                      상호{" "}
                      <span
                        style={{
                          color: "#aaa",
                          fontWeight: 400,
                          fontSize: "11px",
                        }}
                      >
                        (선택)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={cashForm.companyName || ""}
                      onChange={(e) =>
                        setCashForm((f) => ({
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
                      onClick={() => setCashModal({ mode: null })}
                    >
                      취소
                    </button>
                    <button type="submit" className="btn-primary">
                      {cashModal.mode === "add" ? "추가" : "수정"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 법인카드 모달 */}
          {receiptModal.mode && (
            <div className="modal-bg">
              <div className="modal">
                <div className="modal-header">
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    법인카드(지출){" "}
                    {receiptModal.mode === "add" ? "추가" : "수정"}
                  </h3>
                  <button
                    className="modal-close"
                    onClick={() => setReceiptModal({ mode: null })}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmitReceipt} className="modal-form">
                  <DateField
                    value={receiptForm.date}
                    onChange={(v) => setReceiptForm((f) => ({ ...f, date: v }))}
                  />
                  <div className="field">
                    <label>카테고리 *</label>
                    <select
                      value={receiptForm.category || ""}
                      onChange={(e) =>
                        setReceiptForm((f) => ({
                          ...f,
                          category: e.target.value,
                          amount: "",
                          totalAmount: "",
                        }))
                      }
                      required
                    >
                      {activeCats.length === 0 ? (
                        <option value="">
                          카테고리 없음 (카테고리 관리에서 추가)
                        </option>
                      ) : (
                        activeCats.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.unit === "L" ? "(L)" : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  {receiptForm.category && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: isLUnit ? "#fffbeb" : "#eef2ff",
                        borderRadius: "9px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: isLUnit ? "#92400e" : "#4a6cf7",
                        border: `1px solid ${isLUnit ? "#fde68a" : "#c7d2fe"}`,
                      }}
                    >
                      {isLUnit
                        ? "⛽ 주유 · 주유량(L)과 금액(원) 모두 입력"
                        : "💰 금액(원) 단위 · 공급가액/VAT 자동 계산"}
                    </div>
                  )}
                  <div className="field">
                    <label>내용</label>
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

                  {isLUnit ? (
                    <>
                      <div className="field">
                        <label>주유량 (L) *</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="예: 45.5"
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
                          <span style={unitSuffix}>L</span>
                        </div>
                      </div>
                      <div className="field">
                        <label>주유 금액 *</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            step="1"
                            placeholder="금액 입력"
                            value={receiptForm.totalAmount || ""}
                            onChange={(e) =>
                              setReceiptForm((f) => ({
                                ...f,
                                totalAmount: e.target.value,
                              }))
                            }
                            style={{ width: "100%", paddingRight: "36px" }}
                            required
                          />
                          <span style={unitSuffix}>원</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="field">
                      <label>총금액 *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          step="1"
                          placeholder="금액 입력"
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
                        <span style={unitSuffix}>원</span>
                      </div>
                    </div>
                  )}

                  {Number(priceBase) > 0 && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "9px",
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
                        <span style={{ color: "#6b7280" }}>
                          공급가액 (자동)
                        </span>
                        <strong style={{ color: "#4a6cf7" }}>
                          {previewSupply(priceBase).toLocaleString()}원
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>VAT 10% (자동)</span>
                        <strong style={{ color: "#059669" }}>
                          {previewVat(priceBase).toLocaleString()}원
                        </strong>
                      </div>
                    </div>
                  )}
                  <div className="field">
                    <label>
                      사업자등록번호{" "}
                      <span
                        style={{
                          color: "#aaa",
                          fontWeight: 400,
                          fontSize: "11px",
                        }}
                      >
                        (선택)
                      </span>
                    </label>
                    <input
                      type="text"
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
                          fontWeight: 400,
                          fontSize: "11px",
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
                      onClick={() => setReceiptModal({ mode: null })}
                    >
                      취소
                    </button>
                    <button type="submit" className="btn-primary">
                      {receiptModal.mode === "add" ? "추가" : "수정"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 운행내역 모달 */}
          {drivingModal.mode && (
            <div className="modal-bg">
              <div className="modal">
                <div className="modal-header">
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    운행내역 {drivingModal.mode === "add" ? "추가" : "수정"}
                  </h3>
                  <button
                    className="modal-close"
                    onClick={() => setDrivingModal({ mode: null })}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmitDriving} className="modal-form">
                  <DateField
                    value={drivingForm.date}
                    onChange={(v) => setDrivingForm((f) => ({ ...f, date: v }))}
                  />
                  <div className="field">
                    <label>총주유내역</label>
                    <input
                      type="text"
                      value={drivingForm.totalFuelDetail || ""}
                      onChange={(e) =>
                        setDrivingForm((f) => ({
                          ...f,
                          totalFuelDetail: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div className="field">
                      <label>평균거리 (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={drivingForm.averageDistance || ""}
                        onChange={(e) =>
                          setDrivingForm((f) => ({
                            ...f,
                            averageDistance: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>총주유금액</label>
                      <input
                        type="number"
                        value={drivingForm.totalFuelCost || ""}
                        onChange={(e) =>
                          setDrivingForm((f) => ({
                            ...f,
                            totalFuelCost: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  {error && <p className="field-error">⚠ {error}</p>}
                  <div className="modal-btns">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setDrivingModal({ mode: null })}
                    >
                      취소
                    </button>
                    <button type="submit" className="btn-primary">
                      {drivingModal.mode === "add" ? "추가" : "수정"}
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
}

function CountRow({ label, count, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "12px",
      }}
    >
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ fontWeight: 700, color: count > 0 ? color : "#d1d5db" }}>
        {count > 0 ? `${count}건` : "미입력"}
      </span>
    </div>
  );
}

const selStyle = {
  padding: "8px 12px",
  border: "1.5px solid #e4e8f0",
  borderRadius: "9px",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
  color: "#1a1a2e",
  cursor: "pointer",
};
const outlineBtnStyle = {
  padding: "7px 12px",
  border: "1.5px solid #e4e8f0",
  borderRadius: "9px",
  background: "#fff",
  cursor: "pointer",
  fontSize: "13px",
  color: "#6b7280",
  transition: "all 0.15s",
};
const thS = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 700,
  color: "#9ca3af",
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};
const tdS = { padding: "12px 14px" };
const catBadge = {
  fontSize: "11px",
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: "99px",
  background: "#eef2ff",
  color: "#4a6cf7",
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #c7d2fe",
};
const countBadge = {
  fontSize: "11px",
  fontWeight: 700,
  padding: "2px 7px",
  borderRadius: "99px",
  background: "#e4e8f0",
  color: "#6b7280",
  marginLeft: "5px",
};
const dotBtnStyle = {
  background: "none",
  border: "none",
  fontSize: "16px",
  color: "#c4c9d4",
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: "5px",
  letterSpacing: "1px",
  transition: "color 0.15s",
};
const dropdownStyle = {
  position: "absolute",
  right: 0,
  top: "100%",
  zIndex: 50,
  background: "#fff",
  border: "1px solid #e4e8f0",
  borderRadius: "11px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
  overflow: "hidden",
  minWidth: "100px",
};
const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "10px 16px",
  border: "none",
  background: "#fff",
  fontSize: "13px",
  color: "#374151",
  textAlign: "left",
  cursor: "pointer",
};
const unitSuffix = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "13px",
  color: "#9ca3af",
  fontWeight: 600,
  pointerEvents: "none",
};
