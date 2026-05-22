import { useEffect, useState, useRef } from "react";
import {
  fetchSalesLockStatus,
  fetchSalesReceipts,
  addSalesReceipt,
  updateSalesReceipt,
  deleteSalesReceipt,
  fetchSalesDriving,
  addSalesDriving,
  updateSalesDriving,
  deleteSalesDriving,
} from "../../api/auth";
import axios from "axios";

const BASE_URL = "https://seoul3345.cafe24.com/api";
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const fetchSalesCategories = () =>
  axios.get(`${BASE_URL}/sales-form/categories`, authHeader());
const fetchCash = () => axios.get(`${BASE_URL}/sales-form/cash`, authHeader());
const addCash = (data) =>
  axios.post(`${BASE_URL}/sales-form/cash`, data, authHeader());
const updateCash = (id, d) =>
  axios.put(`${BASE_URL}/sales-form/cash/${id}`, d, authHeader());
const deleteCashFn = (id) =>
  axios.delete(`${BASE_URL}/sales-form/cash/${id}`, authHeader());

const getWeekRange = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const f = (d) => d.toISOString().split("T")[0];
  return { min: f(monday), max: f(sunday) };
};

const fmt = (n) => Number(n || 0).toLocaleString() + "원";

export default function SalesContent() {
  const now = new Date();
  const username = sessionStorage.getItem("username");
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { min: weekMin, max: weekMax } = getWeekRange();
  const todayStr = now.toISOString().split("T")[0];

  const [isLocked, setIsLocked] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [drivings, setDrivings] = useState([]);
  const [cashes, setCashes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("receipt");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const [receiptModal, setReceiptModal] = useState({ mode: null, data: null });
  const [drivingModal, setDrivingModal] = useState({ mode: null, data: null });
  const [cashModal, setCashModal] = useState({ mode: null, data: null });

  const emptyReceipt = {
    date: todayStr,
    category: "",
    content: "",
    amount: "",
    totalAmount: "",
    businessNumber: "",
    companyName: "",
  };
  const emptyDriving = {
    date: todayStr,
    totalFuelDetail: "",
    averageDistance: "",
    totalFuelCost: "",
  };
  const emptyCash = {
    date: todayStr,
    type: "지출",
    paymentType: "현금",
    category: "",
    content: "",
    amount: "",
    totalAmount: "",
    companyName: "",
  };

  const [receiptForm, setReceiptForm] = useState(emptyReceipt);
  const [drivingForm, setDrivingForm] = useState(emptyDriving);
  const [cashForm, setCashForm] = useState(emptyCash);

  // receiptForm 선언 후에 참조
  const selectedUnit =
    categories.find((c) => c.name === receiptForm.category)?.unit || "원";
  const isLUnit = selectedUnit === "L";
  const cashSelectedUnit =
    categories.find((c) => c.name === cashForm.category)?.unit || "원";
  const isCashLUnit = cashSelectedUnit === "L";

  const load = async () => {
    try {
      const [lock, r, d, ca, c] = await Promise.all([
        fetchSalesLockStatus(),
        fetchSalesReceipts(),
        fetchSalesDriving(),
        fetchCash(),
        fetchSalesCategories(),
      ]);
      setIsLocked(lock.data.locked);
      setReceipts(r.data);
      setDrivings(d.data);
      setCashes(ca.data);
      setCategories(c.data);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const checkLocked = () => {
    if (isLocked) {
      setError("이번 달은 잠겨있습니다.");
      return true;
    }
    return false;
  };

  // 법인카드
  const openReceiptAdd = () => {
    setError("");
    setReceiptForm({ ...emptyReceipt, category: categories[0]?.name || "" });
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
    setSuccess("");
    if (checkLocked()) return;
    if (!receiptForm.category) {
      setError("카테고리를 선택해주세요.");
      return;
    }
    try {
      if (receiptModal.mode === "add") {
        await addSalesReceipt({ ...receiptForm });
        setSuccess("추가되었습니다.");
      } else {
        await updateSalesReceipt(receiptModal.data.id, { ...receiptForm });
        setSuccess("수정되었습니다.");
      }
      setReceiptModal({ mode: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteReceipt = async (id) => {
    if (checkLocked()) return;
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteSalesReceipt(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // 운행내역
  const openDrivingAdd = () => {
    setError("");
    setDrivingForm(emptyDriving);
    setDrivingModal({ mode: "add" });
  };
  const openDrivingEdit = (row) => {
    setError("");
    setOpenMenu(null);
    setDrivingForm({
      date: row.date || todayStr,
      totalFuelDetail: row.totalFuelDetail,
      averageDistance: row.averageDistance,
      totalFuelCost: row.totalFuelCost,
    });
    setDrivingModal({ mode: "edit", data: row });
  };
  const handleSubmitDriving = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (checkLocked()) return;
    try {
      if (drivingModal.mode === "add") {
        await addSalesDriving({ ...drivingForm });
        setSuccess("추가되었습니다.");
      } else {
        await updateSalesDriving(drivingModal.data.id, { ...drivingForm });
        setSuccess("수정되었습니다.");
      }
      setDrivingModal({ mode: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteDriving = async (id) => {
    if (checkLocked()) return;
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteSalesDriving(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // 현금 핸들러
  const openCashAdd = () => {
    setError("");
    const firstCat = categories[0];
    setCashForm({ ...emptyCash, category: firstCat?.name || "" });
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
    setSuccess("");
    if (checkLocked()) return;
    const payload = { ...cashForm, unit: cashSelectedUnit };
    try {
      if (cashModal.mode === "add") {
        await addCash(payload);
        setSuccess("추가되었습니다.");
      } else {
        await updateCash(cashModal.data.id, payload);
        setSuccess("수정되었습니다.");
      }
      setCashModal({ mode: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteCash = async (id) => {
    if (checkLocked()) return;
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteCashFn(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // L단위: totalAmount(금액)로 계산, 원단위: amount로 계산
  const priceBase = isLUnit ? receiptForm.totalAmount : receiptForm.amount;
  const previewSupply = priceBase ? Math.round(Number(priceBase) / 1.1) : 0;
  const previewVat = priceBase ? Number(priceBase) - previewSupply : 0;
  const cashPriceBase = isCashLUnit ? cashForm.totalAmount : cashForm.amount;
  const cashPreviewSup = cashPriceBase
    ? Math.round(Number(cashPriceBase) / 1.1)
    : 0;
  const cashPreviewVat = cashPriceBase
    ? Number(cashPriceBase) - cashPreviewSup
    : 0;

  const DateField = ({ value, onChange }) => (
    <div className="field">
      <label>
        날짜 *{" "}
        <span style={{ color: "#f59e0b", fontWeight: 400, fontSize: "11px" }}>
          이번 주만 입력 가능 ({weekMin} ~ {weekMax})
        </span>
      </label>
      <input
        type="date"
        min={weekMin}
        max={weekMax}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  // ··· 드롭다운 메뉴
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

  return (
    <div className="gf-wrapper">
      {/* 헤더 */}
      <div className="gf-header">
        <div>
          <h2 className="gf-title">💼 영업 정산</h2>
          <p className="gf-subtitle">
            {username} · {year}년 {month}월 전체 조회
          </p>
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: "8px" }}>
            {activeTab === "receipt" && (
              <button className="btn-primary" onClick={openReceiptAdd}>
                ＋ 법인카드 추가
              </button>
            )}
            {activeTab === "driving" && (
              <button className="btn-primary" onClick={openDrivingAdd}>
                ＋ 운행내역 추가
              </button>
            )}
            {activeTab === "cash" && (
              <button className="btn-primary" onClick={openCashAdd}>
                ＋ 현금 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* 주간 안내 */}
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "8px",
          padding: "9px 14px",
          marginBottom: "12px",
          fontSize: "12px",
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        📅{" "}
        <span>
          입력은{" "}
          <strong>
            이번 주({weekMin} ~ {weekMax})
          </strong>
          만 가능 · 조회는 {month}월 전체
        </span>
      </div>

      {isLocked && (
        <div
          style={{
            background: "#fff0f0",
            border: "1px solid #fed7d7",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
            fontSize: "13px",
            color: "#dc2626",
            fontWeight: 500,
          }}
        >
          🔒 이번 달은 관리자에 의해 잠겨있습니다.
        </div>
      )}

      {error && (
        <div className="alert alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" onClick={() => setSuccess("")}>
          ✅ {success}
        </div>
      )}

      {/* 탭 */}
      <div className="gf-tab-bar">
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

      {/* 법인카드 탭 */}
      {activeTab === "receipt" && (
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #e8eaed",
            overflow: "visible",
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
              {!isLocked && <col style={{ width: "44px" }} />}
            </colgroup>
            <thead>
              <tr
                style={{
                  background: "#f8f9fb",
                  borderBottom: "1px solid #e8eaed",
                }}
              >
                <th style={thS}>날짜</th>
                <th style={thS}>카테고리</th>
                <th style={thS}>내용</th>
                <th style={{ ...thS, textAlign: "right" }}>총금액</th>
                <th style={{ ...thS, textAlign: "right" }}>공급가액</th>
                <th style={{ ...thS, textAlign: "right" }}>VAT(10%)</th>
                <th style={thS}>사업자번호</th>
                <th style={thS}>상호</th>
                {!isLocked && <th style={thS}></th>}
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
                      color: "#bbb",
                      fontSize: "13px",
                    }}
                  >
                    법인카드 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                    <td style={tdS}>
                      <span style={{ fontSize: "12px", color: "#888" }}>
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
                        <span style={{ color: "#ccc", fontSize: "12px" }}>
                          -
                        </span>
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
                        color: r.unit === "L" ? "#92400e" : "#1557b0",
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
                        color: "#555",
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
                    <td style={{ ...tdS, fontSize: "12px", color: "#666" }}>
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
                    {!isLocked && (
                      <td style={{ ...tdS, position: "relative" }}>
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
                <tr
                  style={{
                    background: "#f0f4ff",
                    borderTop: "2px solid #e8eaed",
                  }}
                >
                  <td
                    colSpan={3}
                    style={{ ...tdS, fontWeight: 700, color: "#1557b0" }}
                  >
                    합계
                  </td>
                  <td
                    style={{
                      ...tdS,
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#1557b0",
                    }}
                  >
                    {fmt(
                      receipts.reduce((s, r) => s + (r.totalAmount || 0), 0),
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
                      receipts.reduce((s, r) => s + (r.supplyAmount || 0), 0),
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
                  <td colSpan={isLocked ? 2 : 3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 운행내역 탭 */}
      {activeTab === "driving" && (
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #e8eaed",
            overflow: "visible",
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
                  background: "#f8f9fb",
                  borderBottom: "1px solid #e8eaed",
                }}
              >
                <th style={thS}>날짜</th>
                <th style={thS}>총주유내역</th>
                <th style={{ ...thS, textAlign: "center" }}>평균거리</th>
                <th style={{ ...thS, textAlign: "right" }}>총주유금액</th>
                {!isLocked && <th style={{ ...thS, width: "44px" }}></th>}
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
                      color: "#bbb",
                      fontSize: "13px",
                    }}
                  >
                    운행내역이 없습니다.
                  </td>
                </tr>
              ) : (
                drivings.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                    <td style={tdS}>
                      <span style={{ fontSize: "12px", color: "#888" }}>
                        {d.date || "-"}
                      </span>
                    </td>
                    <td style={tdS}>{d.totalFuelDetail || "-"}</td>
                    <td style={{ ...tdS, textAlign: "center", color: "#555" }}>
                      {d.averageDistance ? `${d.averageDistance}km` : "-"}
                    </td>
                    <td
                      style={{
                        ...tdS,
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#1557b0",
                      }}
                    >
                      {d.totalFuelCost ? fmt(d.totalFuelCost) : "-"}
                    </td>
                    {!isLocked && (
                      <td style={{ ...tdS, position: "relative" }}>
                        <DotMenu
                          id={`d-${d.id}`}
                          onEdit={() => openDrivingEdit(d)}
                          onDelete={() => handleDeleteDriving(d.id)}
                        />
                      </td>
                    )}
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
            borderRadius: "10px",
            border: "1px solid #e8eaed",
            overflow: "visible",
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
              {!isLocked && <col style={{ width: "44px" }} />}
            </colgroup>
            <thead>
              <tr
                style={{
                  background: "#f8f9fb",
                  borderBottom: "1px solid #e8eaed",
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
                {!isLocked && <th style={thS}></th>}
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
                      color: "#bbb",
                      fontSize: "13px",
                    }}
                  >
                    현금 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                cashes.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                    <td style={tdS}>
                      <span style={{ fontSize: "12px", color: "#888" }}>
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
                          background: c.type === "수입" ? "#d1fae5" : "#fee2e2",
                          color: c.type === "수입" ? "#065f46" : "#dc2626",
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
                            background: "#e8f0fe",
                            color: "#1557b0",
                            fontWeight: 600,
                          }}
                        >
                          {c.paymentType}
                        </span>
                      ) : (
                        <span style={{ color: "#ccc", fontSize: "12px" }}>
                          -
                        </span>
                      )}
                    </td>
                    <td style={tdS}>
                      {c.category ? (
                        <span style={catBadge}>{c.category}</span>
                      ) : (
                        <span style={{ color: "#ccc", fontSize: "12px" }}>
                          -
                        </span>
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
                              ? "#059669"
                              : "#1557b0",
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
                    {!isLocked && (
                      <td style={{ ...tdS, position: "relative" }}>
                        <DotMenu
                          id={`c-${c.id}`}
                          onEdit={() => openCashEdit(c)}
                          onDelete={() => handleDeleteCash(c.id)}
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {cashes.length > 0 && (
              <tfoot>
                <tr
                  style={{
                    background: "#f0f4ff",
                    borderTop: "2px solid #e8eaed",
                  }}
                >
                  <td
                    colSpan={5}
                    style={{ ...tdS, fontWeight: 700, color: "#1557b0" }}
                  >
                    합계
                  </td>
                  <td
                    style={{
                      ...tdS,
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#1557b0",
                    }}
                  >
                    {fmt(cashes.reduce((s, c) => s + (c.totalAmount || 0), 0))}
                  </td>
                  <td
                    style={{
                      ...tdS,
                      textAlign: "right",
                      color: "#555",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(cashes.reduce((s, c) => s + (c.supplyAmount || 0), 0))}
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
                  <td colSpan={isLocked ? 1 : 2}></td>
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

              {/* 수입/지출 버튼 */}
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
                        borderRadius: "8px",
                        fontSize: "13px",
                        cursor: "pointer",
                        fontWeight: cashForm.type === t ? 700 : 400,
                        background:
                          cashForm.type === t
                            ? t === "수입"
                              ? "#d1fae5"
                              : "#fee2e2"
                            : "#fff",
                        color:
                          cashForm.type === t
                            ? t === "수입"
                              ? "#065f46"
                              : "#dc2626"
                            : "#888",
                        borderColor:
                          cashForm.type === t
                            ? t === "수입"
                              ? "#6ee7b7"
                              : "#fca5a5"
                            : "#e0e0e0",
                      }}
                    >
                      {t === "수입" ? "📈 수입" : "📉 지출"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 수입일 때만 결제수단 */}
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
                          borderRadius: "8px",
                          fontSize: "13px",
                          cursor: "pointer",
                          fontWeight: cashForm.paymentType === p ? 700 : 400,
                          background:
                            cashForm.paymentType === p ? "#e8f0fe" : "#fff",
                          color:
                            cashForm.paymentType === p ? "#1557b0" : "#888",
                          borderColor:
                            cashForm.paymentType === p ? "#93c5fd" : "#e0e0e0",
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
                  value={cashForm.category}
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
                  {categories.map((c) => (
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
                  placeholder="내용 입력"
                  value={cashForm.content}
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
                        value={cashForm.amount}
                        onChange={(e) =>
                          setCashForm((f) => ({ ...f, amount: e.target.value }))
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
                        placeholder="금액 입력"
                        value={cashForm.totalAmount}
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
                      placeholder="금액 입력"
                      value={cashForm.amount}
                      onChange={(e) =>
                        setCashForm((f) => ({ ...f, amount: e.target.value }))
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
                    <span style={{ color: "#555" }}>공급가액 (자동)</span>
                    <strong style={{ color: "#1557b0" }}>
                      {cashPreviewSup.toLocaleString()}원
                    </strong>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#555" }}>VAT 10% (자동)</span>
                    <strong style={{ color: "#059669" }}>
                      {cashPreviewVat.toLocaleString()}원
                    </strong>
                  </div>
                </div>
              )}

              <div className="field">
                <label>
                  상호{" "}
                  <span
                    style={{ color: "#aaa", fontWeight: 400, fontSize: "11px" }}
                  >
                    (선택)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="상호명"
                  value={cashForm.companyName}
                  onChange={(e) =>
                    setCashForm((f) => ({ ...f, companyName: e.target.value }))
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
                법인카드(지출) {receiptModal.mode === "add" ? "추가" : "수정"}
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
                onChange={(v) => setReceiptForm({ ...receiptForm, date: v })}
              />
              <div className="field">
                <label>카테고리 *</label>
                <select
                  value={receiptForm.category}
                  onChange={(e) =>
                    setReceiptForm({
                      ...receiptForm,
                      category: e.target.value,
                      amount: "",
                      totalAmount: "",
                    })
                  }
                  required
                >
                  {categories.length === 0 ? (
                    <option value="">
                      카테고리가 없습니다 (관리자에게 문의)
                    </option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.unit === "L" ? "(L)" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="field">
                <label>내용</label>
                <input
                  type="text"
                  placeholder="내용 입력"
                  value={receiptForm.content}
                  onChange={(e) =>
                    setReceiptForm({ ...receiptForm, content: e.target.value })
                  }
                />
              </div>

              {/* L 단위: 주유량 + 금액 둘 다 */}
              {isLUnit ? (
                <>
                  <div className="field">
                    <label>주유량 (L) *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="예: 45.5"
                        value={receiptForm.amount}
                        onChange={(e) =>
                          setReceiptForm({
                            ...receiptForm,
                            amount: e.target.value,
                          })
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
                        value={receiptForm.totalAmount}
                        onChange={(e) =>
                          setReceiptForm({
                            ...receiptForm,
                            totalAmount: e.target.value,
                          })
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
                      value={receiptForm.amount}
                      onChange={(e) =>
                        setReceiptForm({
                          ...receiptForm,
                          amount: e.target.value,
                        })
                      }
                      style={{ width: "100%", paddingRight: "36px" }}
                      required
                    />
                    <span style={unitSuffix}>원</span>
                  </div>
                </div>
              )}

              {/* 공급가액/VAT 미리보기 - L/원 둘 다 표시 */}
              {Number(priceBase) > 0 && (
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
                    <span style={{ color: "#555" }}>공급가액 (자동계산)</span>
                    <strong style={{ color: "#1557b0" }}>
                      {previewSupply.toLocaleString()}원
                    </strong>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#555" }}>VAT 10% (자동계산)</span>
                    <strong style={{ color: "#059669" }}>
                      {previewVat.toLocaleString()}원
                    </strong>
                  </div>
                </div>
              )}

              <div className="field">
                <label>
                  사업자등록번호{" "}
                  <span
                    style={{ color: "#aaa", fontWeight: 400, fontSize: "11px" }}
                  >
                    (선택)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="000-00-00000"
                  value={receiptForm.businessNumber}
                  onChange={(e) =>
                    setReceiptForm({
                      ...receiptForm,
                      businessNumber: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>
                  상호{" "}
                  <span
                    style={{ color: "#aaa", fontWeight: 400, fontSize: "11px" }}
                  >
                    (선택)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="상호명"
                  value={receiptForm.companyName}
                  onChange={(e) =>
                    setReceiptForm({
                      ...receiptForm,
                      companyName: e.target.value,
                    })
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
                onChange={(v) => setDrivingForm({ ...drivingForm, date: v })}
              />
              <div className="field">
                <label>총주유내역</label>
                <input
                  type="text"
                  placeholder="주유 내역"
                  value={drivingForm.totalFuelDetail}
                  onChange={(e) =>
                    setDrivingForm({
                      ...drivingForm,
                      totalFuelDetail: e.target.value,
                    })
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
                    placeholder="km"
                    value={drivingForm.averageDistance}
                    onChange={(e) =>
                      setDrivingForm({
                        ...drivingForm,
                        averageDistance: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>총주유금액</label>
                  <input
                    type="number"
                    placeholder="금액"
                    value={drivingForm.totalFuelCost}
                    onChange={(e) =>
                      setDrivingForm({
                        ...drivingForm,
                        totalFuelCost: e.target.value,
                      })
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
  );
}

const thS = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 600,
  color: "#888",
  letterSpacing: "0.3px",
};
const tdS = { padding: "12px 14px" };
const catBadge = {
  fontSize: "11px",
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: "99px",
  background: "#e8f0fe",
  color: "#1557b0",
};
const countBadge = {
  fontSize: "11px",
  fontWeight: 600,
  padding: "2px 7px",
  borderRadius: "99px",
  background: "#e8eaed",
  color: "#555",
  marginLeft: "4px",
};
const dotBtnStyle = {
  background: "none",
  border: "none",
  fontSize: "16px",
  color: "#aaa",
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: "4px",
  letterSpacing: "1px",
};
const dropdownStyle = {
  position: "absolute",
  right: 0,
  top: "100%",
  zIndex: 50,
  background: "#fff",
  border: "1px solid #e8eaed",
  borderRadius: "10px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
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
  color: "#333",
  textAlign: "left",
  cursor: "pointer",
};
const unitSuffix = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "13px",
  color: "#888",
  fontWeight: 600,
  pointerEvents: "none",
};
