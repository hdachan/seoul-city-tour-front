import { useEffect, useState } from "react";
import {
  fetchTourNames,
  fetchExpenseCategories,
  fetchGuideLockStatus,
  fetchGuideRecords,
  addGuideRecord,
  updateGuideRecord,
  deleteGuideRecord,
  fetchGuideExpense,
  addGuideExpense,
  updateGuideExpense,
  deleteGuideExpense,
  fetchGuideDailyFee,
  addGuideDailyFee,
  updateGuideDailyFee,
  deleteGuideDailyFee,
} from "../../api/auth";
import "./GuideFormContent.css";

const TAX_RATE = 0.033;
const today = () => new Date().toISOString().split("T")[0];
const getWeekRange = () => {
  const now = new Date();
  const max = now.toISOString().split("T")[0];
  const min = new Date(now);
  min.setDate(now.getDate() - 6);
  return { min: min.toISOString().split("T")[0], max };
};

const SelectBtn = ({ options, value, onChange, badgeFn }) => (
  <div style={{ display: "flex", gap: "8px" }}>
    {options.map((opt) => {
      const label =
        opt === "그외-현금" ? "현금" : opt === "그외-카드" ? "카드" : opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            flex: 1,
            padding: "9px",
            border: "1.5px solid",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: value === opt ? 600 : 400,
            ...(value === opt
              ? badgeFn
                ? badgeFn(opt)
                : {
                    background: "#e8f0fe",
                    color: "#1557b0",
                    borderColor: "#1557b0",
                  }
              : { background: "#fff", color: "#555", borderColor: "#e0e0e0" }),
          }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default function GuideFormContent() {
  const now = new Date();
  const username = sessionStorage.getItem("username");
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [isLocked, setIsLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedDate, setSelectedDate] = useState(today());
  const [tourNames, setTourNames] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [records, setRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dailyFees, setDailyFees] = useState([]);
  const [activeTab, setActiveTab] = useState("records");
  const [error, setError] = useState("");
  const [incomeError, setIncomeError] = useState("");
  const [success, setSuccess] = useState("");

  // 모달 상태 (mode: null | 'add' | 'edit')
  const [showExtraPersons, setShowExtraPersons] = useState(false);
  const [incomeModal, setIncomeModal] = useState({ mode: null, data: null });
  const [expenseModal, setExpenseModal] = useState({ mode: null, data: null });
  const [dailyFeeModal, setDailyFeeModal] = useState({
    mode: null,
    data: null,
  });

  const emptyIncome = {
    tourName: "",
    representativeName: "",
    paymentType: "현금",
    amount: "",
    headcount: "",
    adult: "",
    child: "",
    childAmount: "",
    infant: "",
    memo: "",
    date: today(),
  };
  const emptyExpense = {
    expenseType: "",
    amount: "",
    headcount: "",
    adult: "",
    child: "",
    memo: "",
    paymentType: "현금",
  };
  const emptyFee = { amount: "", date: today() };

  const [incomeForm, setIncomeForm] = useState(emptyIncome);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [dailyFeeForm, setDailyFeeForm] = useState(emptyFee);

  const load = async () => {
    try {
      const [lock, t, r, e, d, ec] = await Promise.all([
        fetchGuideLockStatus(),
        fetchTourNames(),
        fetchGuideRecords(),
        fetchGuideExpense(),
        fetchGuideDailyFee(),
        fetchExpenseCategories(),
      ]);
      setIsLocked(lock.data.locked);
      setTourNames(t.data);
      setExpenseCategories(ec.data);
      setRecords(r.data);
      setExpenses(e.data);
      setDailyFees(d.data);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const checkLocked = () => {
    if (isLocked) {
      setError("이번 달은 관리자에 의해 잠겨있습니다.");
      return true;
    }
    return false;
  };

  // ── 수입 모달 열기 ──
  const openIncomeAdd = () => {
    setIncomeForm(emptyIncome);
    setIncomeModal({ mode: "add" });
  };
  const openIncomeEdit = (row) => {
    setIncomeForm({
      tourName: row.tourName,
      representativeName: row.representativeName,
      paymentType: row.paymentType,
      amount: row.amount || "",
      headcount: row.headcount || "",
      adult: row.adult || "",
      child: row.child || "",
      childAmount: row.childAmount || "",
      infant: row.infant || "",
      memo: row.memo || "",
    });
    setIncomeModal({ mode: "edit", data: row });
  };

  const handleSubmitIncome = async (e) => {
    e.preventDefault();
    setIncomeError("");
    setSuccess("");
    if (checkLocked()) return;
    if (!incomeForm.tourName || incomeForm.tourName === "선택하세요") {
      setIncomeError("투어이름을 선택해주세요.");
      return;
    }
    if (incomeForm.paymentType === "그외") {
      setIncomeError("그외 결제수단을 선택해주세요. (그외-현금 / 그외-카드)");
      return;
    }
    if (
      incomeForm.paymentType !== "완불" &&
      !["그외", "그외-현금", "그외-카드"].includes(incomeForm.paymentType) &&
      (!incomeForm.amount || !incomeForm.adult)
    ) {
      setIncomeError("금액과 인원을 입력해주세요.");
      return;
    }
    try {
      if (incomeModal.mode === "add") {
        const noteVal =
          incomeForm.note === "기타"
            ? incomeForm.noteCustom || "기타"
            : incomeForm.note || "";
        await addGuideRecord({
          ...incomeForm,
          note: noteVal,
          date: incomeForm.date || today(),
        });
        setSuccess("수입이 추가되었습니다.");
      } else {
        const noteVal =
          incomeForm.note === "기타"
            ? incomeForm.noteCustom || "기타"
            : incomeForm.note || "";
        await updateGuideRecord(incomeModal.data.id, {
          ...incomeForm,
          note: noteVal,
        });
        setSuccess("수입이 수정되었습니다.");
      }
      setIncomeModal({ mode: null });
      load();
    } catch (err) {
      setIncomeError(err.response?.data?.error || "처리 실패");
    }
  };

  const handleDeleteRecord = async (id) => {
    if (checkLocked()) return;
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteGuideRecord(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // ── 지출 모달 열기 ──
  const openExpenseAdd = () => {
    setExpenseForm(emptyExpense);
    setExpenseModal({ mode: "add" });
  };
  const openExpenseEdit = (row) => {
    setExpenseForm({
      expenseType: row.expenseType,
      amount: row.amount,
      headcount: row.headcount,
      adult: row.adult || "",
      child: row.child || "",
      childAmount: row.childAmount || "",
      infant: row.infant || "",
      memo: row.memo || "",
      paymentType: row.paymentType,
    });
    setExpenseModal({ mode: "edit", data: row });
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (checkLocked()) return;
    if (!expenseForm.amount || !expenseForm.headcount) {
      setError("금액과 인원을 입력해주세요.");
      return;
    }
    try {
      if (expenseModal.mode === "add") {
        await addGuideExpense({ ...expenseForm });
        setSuccess("지출이 추가되었습니다.");
      } else {
        await updateGuideExpense(expenseModal.data.id, { ...expenseForm });
        setSuccess("지출이 수정되었습니다.");
      }
      setExpenseModal({ mode: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (checkLocked()) return;
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteGuideExpense(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // ── 일비 모달 열기 ──
  const openFeeAdd = () => {
    setDailyFeeForm(emptyFee);
    setDailyFeeModal({ mode: "add" });
  };
  const openFeeEdit = (row) => {
    setDailyFeeForm({ amount: row.amount, date: row.date });
    setDailyFeeModal({ mode: "edit", data: row });
  };

  const handleSubmitFee = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (checkLocked()) return;
    if (!dailyFeeForm.amount || !dailyFeeForm.date) {
      setError("금액과 날짜를 입력해주세요.");
      return;
    }
    try {
      if (dailyFeeModal.mode === "add") {
        await addGuideDailyFee(Number(dailyFeeForm.amount), dailyFeeForm.date);
        setSuccess("일비가 추가되었습니다.");
      } else {
        await updateGuideDailyFee(
          dailyFeeModal.data.id,
          Number(dailyFeeForm.amount),
          dailyFeeForm.date,
        );
        setSuccess("일비가 수정되었습니다.");
      }
      setDailyFeeModal({ mode: null });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };

  const handleDeleteFee = async (id) => {
    if (checkLocked()) return;
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteGuideDailyFee(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  const previewIncomeTotal = () =>
    Number(incomeForm.amount || 0) * Number(incomeForm.adult || 0) +
    Number(incomeForm.childAmount || 0) * Number(incomeForm.child || 0);
  const previewExpenseTotal = () =>
    Number(expenseForm.amount || 0) * Number(expenseForm.headcount || 0);

  const filteredRecords = records.filter((r) => r.date === selectedDate);
  const filteredExpenses = expenses.filter((e) => e.date === selectedDate);
  const filteredDailyFees = dailyFees.filter((d) => d.date === selectedDate);

  // 날짜 이동
  const moveDate = (dir) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const cashTotal = filteredRecords
    .filter((r) => r.paymentType === "현금" || r.paymentType === "그외-현금")
    .reduce((s, r) => s + (r.totalAmount || 0), 0);
  const expCashTotal = filteredExpenses
    .filter((e) => e.paymentType === "현금")
    .reduce((s, e) => s + (e.totalAmount || 0), 0);
  const netTotal = cashTotal - expCashTotal;
  const totalHeadcount = filteredRecords.reduce(
    (s, r) => s + (Number(r.headcount) || 0),
    0,
  );
  const totalDailyFee = dailyFees.reduce((s, d) => s + d.amount, 0);
  const taxAmount = Math.round(totalDailyFee * TAX_RATE);
  const actualDailyFee = totalDailyFee - taxAmount;

  const fmt = (n) => Number(n).toLocaleString() + "원";
  const payBadge = (type) =>
    ({
      현금: { background: "#d1fae5", color: "#065f46" },
      카드: { background: "#dbeafe", color: "#1e40af" },
      그외: { background: "#f3f4f6", color: "#555" },
      "그외-현금": { background: "#f3f4f6", color: "#555" },
      "그외-카드": { background: "#f3f4f6", color: "#555" },
      완불: { background: "#fef9c3", color: "#854d0e" },
    })[type] || { background: "#f3f4f6", color: "#555" };
  const expTypeBadge = (type) =>
    type === "북한관 입장료" || type === "북한책"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#ede9fe", color: "#5b21b6" };

  const ActionBtns = ({ onEdit, onDelete, locked }) => (
    <div style={{ display: "flex", gap: "4px" }}>
      {!locked && (
        <button
          onClick={onEdit}
          style={{
            padding: "4px 10px",
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          수정
        </button>
      )}
      {!locked && (
        <button onClick={onDelete} className="delete-btn">
          삭제
        </button>
      )}
    </div>
  );

  return (
    <div className="gf-wrapper">
      <div className="gf-header">
        <div>
          <h2 className="gf-title">📝 가이드 정산</h2>
          <p className="gf-subtitle">
            {username} · {year}년 {month}월
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => moveDate(-1)}
              style={{
                background: "none",
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ‹
            </button>
            <input
              type="date"
              value={selectedDate}
              min={`${year}-${String(month).padStart(2, "0")}-01`}
              max={`${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "13px",
              }}
            />
            <button
              type="button"
              onClick={() => moveDate(1)}
              style={{
                background: "none",
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ›
            </button>
          </div>
        </div>
        {!isLocked && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-primary" onClick={openIncomeAdd}>
              ＋ 수입 추가
            </button>
            <button className="btn-outline" onClick={openExpenseAdd}>
              ＋ 지출 추가
            </button>
            <button className="btn-outline" onClick={openFeeAdd}>
              ＋ 일비 추가
            </button>
          </div>
        )}
      </div>

      {isLocked && (
        <div
          style={{
            background: "#fff0f0",
            border: "1px solid #fed7d7",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "1rem",
            fontSize: "14px",
            color: "#e53e3e",
            fontWeight: 500,
          }}
        >
          🔒 이번 달은 관리자에 의해 잠겨있습니다. 수정이 불가합니다.
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

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">총 인원수</div>
          <div className="summary-value" style={{ color: "#1557b0" }}>
            {totalHeadcount}명
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">현금 수입합계</div>
          <div className="summary-value cash">{fmt(cashTotal)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">지출합계 (현금)</div>
          <div className="summary-value expense">{fmt(expCashTotal)}</div>
        </div>
        <div
          className={`summary-card ${netTotal >= 0 ? "positive" : "negative"}`}
        >
          <div className="summary-label">토탈</div>
          <div className={`summary-value ${netTotal >= 0 ? "plus" : "minus"}`}>
            {netTotal >= 0 ? "+" : ""}
            {fmt(netTotal)}
          </div>
        </div>
      </div>

      <div className="gf-tab-bar">
        <button
          className={`gf-tab ${activeTab === "records" ? "active" : ""}`}
          onClick={() => setActiveTab("records")}
        >
          수입 ({filteredRecords.length}건)
        </button>
        <button
          className={`gf-tab ${activeTab === "expense" ? "active" : ""}`}
          onClick={() => setActiveTab("expense")}
        >
          지출 ({filteredExpenses.length}건)
        </button>
        <button
          className={`gf-tab ${activeTab === "dailyfee" ? "active" : ""}`}
          onClick={() => setActiveTab("dailyfee")}
        >
          일비 ({filteredDailyFees.length}건)
        </button>
      </div>

      {activeTab === "records" && (
        <>
          {isMobile ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {filteredRecords.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#bbb",
                    fontSize: "13px",
                  }}
                >
                  수입 내역이 없습니다.
                </div>
              ) : (
                filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e8eaed",
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px" }}>
                          {r.tourName}
                        </div>
                        {r.representativeName && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginTop: "2px",
                            }}
                          >
                            {r.representativeName}
                          </div>
                        )}
                      </div>
                      <span
                        className="pay-badge"
                        style={payBadge(r.paymentType)}
                      >
                        {r.paymentType}
                      </span>
                    </div>
                    {r.note && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#1557b0",
                          background: "#e8f0fe",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          display: "inline-block",
                          marginBottom: "8px",
                        }}
                      >
                        {r.note}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        {Number(r.amount) > 0 && (
                          <div>어른 {fmt(r.amount)}</div>
                        )}
                        {Number(r.childAmount) > 0 && (
                          <div>
                            아이 {Number(r.childAmount).toLocaleString()}원
                          </div>
                        )}
                        {r.adult ? (
                          <div>
                            어른 {r.adult}
                            {r.child ? ` / 아이 ${r.child}` : ""}
                            {r.infant ? ` / 유아 ${r.infant}` : ""}명
                          </div>
                        ) : r.headcount ? (
                          <div>{r.headcount}명</div>
                        ) : null}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "#059669",
                        }}
                      >
                        {r.totalAmount ? fmt(r.totalAmount) + "원" : "-"}
                      </div>
                    </div>
                    {!isLocked && (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginTop: "10px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => openIncomeEdit(r)}
                          style={{
                            padding: "5px 12px",
                            background: "#eff6ff",
                            color: "#1557b0",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          style={{
                            padding: "5px 12px",
                            background: "#fff0f0",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="gf-table-wrap">
              <table className="gf-table">
                <thead>
                  <tr>
                    <th>투어이름</th>
                    <th>대표자</th>
                    <th>결제</th>
                    <th>금액(1인)</th>
                    <th>인원</th>
                    <th>합계</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty">
                        수입 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id}>
                        <td>{r.tourName}</td>
                        <td>{r.representativeName || "-"}</td>
                        <td>
                          <span
                            className="pay-badge"
                            style={payBadge(r.paymentType)}
                          >
                            {r.paymentType}
                          </span>
                        </td>
                        <td className="td-right">
                          <div>{r.amount ? fmt(r.amount) : "-"}</div>
                          {Number(r.childAmount) > 0 && (
                            <div style={{ fontSize: "11px", color: "#888" }}>
                              아이 {Number(r.childAmount).toLocaleString()}원
                            </div>
                          )}
                        </td>
                        <td className="td-center">
                          {r.adult
                            ? `어른 ${r.adult}${r.child ? " / 아이 " + r.child : ""}${r.infant ? " / 유아 " + r.infant : ""}명`
                            : r.headcount
                              ? r.headcount + "명"
                              : "-"}
                        </td>
                        <td className="td-right total-cell">
                          {r.totalAmount ? fmt(r.totalAmount) : "-"}
                        </td>
                        <td>
                          <ActionBtns
                            locked={isLocked}
                            onEdit={() => openIncomeEdit(r)}
                            onDelete={() => handleDeleteRecord(r.id)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "expense" && (
        <>
          {isMobile ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {filteredExpenses.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#bbb",
                    fontSize: "13px",
                  }}
                >
                  지출 내역이 없습니다.
                </div>
              ) : (
                filteredExpenses.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e8eaed",
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        className="pay-badge"
                        style={expTypeBadge(e.expenseType)}
                      >
                        {e.expenseType}
                      </span>
                      <span
                        className="pay-badge"
                        style={payBadge(e.paymentType)}
                      >
                        {e.paymentType}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        {fmt(e.amount)}원
                        {e.headcount ? " × " + e.headcount + "명" : ""}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "#dc2626",
                        }}
                      >
                        {e.totalAmount ? fmt(e.totalAmount) + "원" : "-"}
                      </div>
                    </div>
                    {!isLocked && (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginTop: "10px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => openExpenseEdit(e)}
                          style={{
                            padding: "5px 12px",
                            background: "#eff6ff",
                            color: "#1557b0",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          style={{
                            padding: "5px 12px",
                            background: "#fff0f0",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="gf-table-wrap">
              <table className="gf-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>결제</th>
                    <th>금액(1인)</th>
                    <th>인원</th>
                    <th>합계</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty">
                        지출 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <span
                            className="pay-badge"
                            style={expTypeBadge(e.expenseType)}
                          >
                            {e.expenseType}
                          </span>
                        </td>
                        <td>
                          <span
                            className="pay-badge"
                            style={payBadge(e.paymentType)}
                          >
                            {e.paymentType}
                          </span>
                        </td>
                        <td className="td-right">{fmt(e.amount)}</td>
                        <td className="td-center">
                          {e.headcount ? `${e.headcount}명` : "-"}
                        </td>
                        <td className="td-right total-cell">
                          {e.totalAmount ? fmt(e.totalAmount) : "-"}
                        </td>
                        <td>
                          <ActionBtns
                            locked={isLocked}
                            onEdit={() => openExpenseEdit(e)}
                            onDelete={() => handleDeleteExpense(e.id)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === "dailyfee" && (
        <div>
          {totalDailyFee > 0 && (
            <div className="daily-fee-card">
              <div className="daily-fee-title">💰 일비 정산 (3.3%)</div>
              <div className="daily-fee-grid">
                <div>
                  <div className="daily-label">총 일비</div>
                  <div className="daily-value">{fmt(totalDailyFee)}</div>
                </div>
                <div>
                  <div className="daily-label">신고액</div>
                  <div className="daily-value tax">- {fmt(taxAmount)}</div>
                </div>
                <div>
                  <div className="daily-label">실수령액</div>
                  <div className="daily-value actual">
                    {fmt(actualDailyFee)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>일비 금액</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredDailyFees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      일비 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDailyFees.map((d) => (
                    <tr key={d.id}>
                      <td>{d.date}</td>
                      <td
                        className="td-right"
                        style={{ fontWeight: 600, color: "#1d4ed8" }}
                      >
                        {fmt(d.amount)}
                      </td>
                      <td>
                        <ActionBtns
                          locked={isLocked}
                          onEdit={() => openFeeEdit(d)}
                          onDelete={() => handleDeleteFee(d.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 수입 모달 */}
      {incomeModal.mode && (
        <div className="modal-bg">
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, calc(100vw - 32px))",
              boxSizing: "border-box",
            }}
          >
            <h3 className="modal-title">
              {incomeModal.mode === "add" ? "수입 추가" : "수입 수정"}
            </h3>
            <form onSubmit={handleSubmitIncome} className="modal-form">
              <div className="field">
                <label>날짜</label>
                {(() => {
                  const { min, max } = getWeekRange();
                  return (
                    <input
                      type="date"
                      value={incomeForm.date || today()}
                      min={min}
                      max={max}
                      onChange={(e) =>
                        setIncomeForm((f) => ({ ...f, date: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1.5px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  );
                })()}
              </div>
              <div className="field">
                <label>투어이름 *</label>
                <select
                  value={incomeForm.tourName}
                  onChange={(e) =>
                    setIncomeForm({ ...incomeForm, tourName: e.target.value })
                  }
                >
                  <option value="">선택하세요</option>
                  {tourNames.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>대표자이름</label>
                <input
                  type="text"
                  placeholder="대표자 이름"
                  value={incomeForm.representativeName}
                  onChange={(e) =>
                    setIncomeForm({
                      ...incomeForm,
                      representativeName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>결제유형 *</label>
                <SelectBtn
                  options={["현금", "카드", "그외", "완불"]}
                  value={
                    ["그외-현금", "그외-카드"].includes(incomeForm.paymentType)
                      ? "그외"
                      : incomeForm.paymentType
                  }
                  onChange={(v) =>
                    setIncomeForm((f) => ({ ...f, paymentType: v }))
                  }
                />
              </div>
              {(incomeForm.paymentType === "그외" ||
                incomeForm.paymentType === "그외-현금" ||
                incomeForm.paymentType === "그외-카드") && (
                <div className="field">
                  <label>그외 결제수단</label>
                  <SelectBtn
                    options={["그외-현금", "그외-카드"]}
                    value={incomeForm.paymentType}
                    onChange={(v) =>
                      setIncomeForm((f) => ({ ...f, paymentType: v }))
                    }
                    badgeFn={(opt) => ({
                      background:
                        opt === incomeForm.paymentType ? "#e8f0fe" : "#fff",
                      color:
                        opt === incomeForm.paymentType ? "#1557b0" : "#555",
                      borderColor:
                        opt === incomeForm.paymentType ? "#1557b0" : "#e0e0e0",
                    })}
                  />
                </div>
              )}
              {/* 완불 - 어른 기본 + 아이/유아 토글 */}
              {incomeForm.paymentType === "완불" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: "6px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowExtraPersons((v) => !v)}
                      style={{
                        fontSize: "11px",
                        color: "#1557b0",
                        background: "none",
                        border: "1px solid #1557b0",
                        borderRadius: "6px",
                        padding: "3px 10px",
                        cursor: "pointer",
                      }}
                    >
                      {showExtraPersons
                        ? "▲ 아이/유아 숨기기"
                        : "＋ 아이/유아 추가"}
                    </button>
                  </div>
                  <div className="field">
                    <label>어른</label>
                    <input
                      type="number"
                      placeholder="명"
                      value={incomeForm.adult || ""}
                      onChange={(e) =>
                        setIncomeForm((f) => ({ ...f, adult: e.target.value }))
                      }
                    />
                  </div>
                  {showExtraPersons && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        marginTop: "8px",
                      }}
                    >
                      <div className="field">
                        <label>아이 금액(1인)</label>
                        <input
                          type="number"
                          placeholder="금액"
                          value={incomeForm.childAmount || ""}
                          onChange={(e) =>
                            setIncomeForm((f) => ({
                              ...f,
                              childAmount: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>아이 인원</label>
                        <input
                          type="number"
                          placeholder="명"
                          value={incomeForm.child || ""}
                          onChange={(e) =>
                            setIncomeForm((f) => ({
                              ...f,
                              child: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>
                          유아{" "}
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#aaa",
                              fontWeight: 400,
                            }}
                          >
                            (무료)
                          </span>
                        </label>
                        <input
                          type="number"
                          placeholder="명"
                          value={incomeForm.infant || ""}
                          onChange={(e) =>
                            setIncomeForm((f) => ({
                              ...f,
                              infant: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* 현금/카드 - 금액 + 어른 기본 + 아이/유아 토글 */}
              {incomeForm.paymentType !== "완불" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: "6px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowExtraPersons((v) => !v)}
                      style={{
                        fontSize: "11px",
                        color: "#1557b0",
                        background: "none",
                        border: "1px solid #1557b0",
                        borderRadius: "6px",
                        padding: "3px 10px",
                        cursor: "pointer",
                      }}
                    >
                      {showExtraPersons
                        ? "▲ 아이/유아 숨기기"
                        : "＋ 아이/유아 추가"}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div className="field">
                      <label>금액 (1인)</label>
                      <input
                        type="number"
                        placeholder="금액"
                        value={incomeForm.amount}
                        onChange={(e) =>
                          setIncomeForm((f) => ({
                            ...f,
                            amount: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label>어른</label>
                      <input
                        type="number"
                        placeholder="명"
                        value={incomeForm.adult || ""}
                        onChange={(e) =>
                          setIncomeForm((f) => ({
                            ...f,
                            adult: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  {showExtraPersons && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        marginTop: "8px",
                      }}
                    >
                      <div className="field">
                        <label>아이 금액(1인)</label>
                        <input
                          type="number"
                          placeholder="금액"
                          value={incomeForm.childAmount || ""}
                          onChange={(e) =>
                            setIncomeForm((f) => ({
                              ...f,
                              childAmount: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>아이 인원</label>
                        <input
                          type="number"
                          placeholder="명"
                          value={incomeForm.child || ""}
                          onChange={(e) =>
                            setIncomeForm((f) => ({
                              ...f,
                              child: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <label>
                          유아{" "}
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#aaa",
                              fontWeight: 400,
                            }}
                          >
                            (무료)
                          </span>
                        </label>
                        <input
                          type="number"
                          placeholder="명"
                          value={incomeForm.infant || ""}
                          onChange={(e) =>
                            setIncomeForm((f) => ({
                              ...f,
                              infant: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                  {incomeForm.amount &&
                    (incomeForm.adult || incomeForm.headcount) && (
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
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: "#555" }}>
                            어른{" "}
                            {Number(incomeForm.amount || 0).toLocaleString()}원×
                            {incomeForm.adult || 0}명
                            {Number(incomeForm.child || 0) > 0
                              ? ` + 아이 ${Number(incomeForm.childAmount || 0).toLocaleString()}원×${incomeForm.child}명`
                              : ""}
                            {Number(incomeForm.infant || 0) > 0
                              ? ` + 유아 ${incomeForm.infant}명(무료)`
                              : ""}
                          </span>
                          <strong
                            style={{ color: "#059669", fontSize: "15px" }}
                          >
                            = {Number(previewIncomeTotal()).toLocaleString()}원
                          </strong>
                        </div>
                      </div>
                    )}
                </>
              )}
              {/* note 필드 - 그외 + DMZ/출렁다리 */}
              {["그외", "그외-현금", "그외-카드"].includes(
                incomeForm.paymentType,
              ) &&
                (incomeForm.tourName || "").match(/DMZ|출렁다리/i) && (
                  <div className="field">
                    <label>항목 선택</label>
                    <div
                      style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                    >
                      {(expenseCategories.length > 0
                        ? [...expenseCategories.map((c) => c.name), "기타"]
                        : ["북한관 입장료", "가이드입장료", "기타"]
                      ).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setIncomeForm((f) => ({
                              ...f,
                              note: f.note === opt ? "" : opt,
                            }))
                          }
                          style={{
                            padding: "8px 14px",
                            border: "1.5px solid",
                            borderRadius: "8px",
                            fontSize: "13px",
                            cursor: "pointer",
                            fontWeight: incomeForm.note === opt ? 700 : 400,
                            background:
                              incomeForm.note === opt ? "#e8f0fe" : "#fff",
                            color: incomeForm.note === opt ? "#1557b0" : "#888",
                            borderColor:
                              incomeForm.note === opt ? "#1557b0" : "#e0e0e0",
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {incomeForm.note === "기타" && (
                      <input
                        type="text"
                        placeholder="직접 입력"
                        value={incomeForm.noteCustom || ""}
                        onChange={(e) =>
                          setIncomeForm((f) => ({
                            ...f,
                            noteCustom: e.target.value,
                          }))
                        }
                        style={{
                          marginTop: "8px",
                          width: "100%",
                          padding: "9px 12px",
                          border: "1.5px solid #d8dce3",
                          borderRadius: "8px",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                    )}
                  </div>
                )}
              {/* note 필드 - 그외 + 모닝/오후/투어 */}
              {["그외", "그외-현금", "그외-카드"].includes(
                incomeForm.paymentType,
              ) &&
                (incomeForm.tourName || "").match(/모닝|오후|투어/i) && (
                  <div className="field">
                    <label>기타</label>
                    <input
                      type="text"
                      placeholder="내용 입력"
                      value={incomeForm.note || ""}
                      onChange={(e) =>
                        setIncomeForm((f) => ({ ...f, note: e.target.value }))
                      }
                    />
                  </div>
                )}
              <div className="field">
                <label>비고</label>
                <input
                  type="text"
                  placeholder="비고 입력 (선택)"
                  value={incomeForm.memo || ""}
                  onChange={(e) =>
                    setIncomeForm((f) => ({ ...f, memo: e.target.value }))
                  }
                />
              </div>
              {incomeError && <p className="field-error">⚠ {incomeError}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setIncomeModal({ mode: null });
                    setIncomeError("");
                  }}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  {incomeModal.mode === "add" ? "추가" : "수정"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 지출 모달 */}
      {expenseModal.mode && (
        <div className="modal-bg">
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, calc(100vw - 32px))",
              boxSizing: "border-box",
            }}
          >
            <h3 className="modal-title">
              {expenseModal.mode === "add" ? "지출 추가" : "지출 수정"}
            </h3>
            <form onSubmit={handleSubmitExpense} className="modal-form">
              <div className="field">
                <label>항목 *</label>
                <SelectBtn
                  options={
                    expenseCategories.length > 0
                      ? expenseCategories.map((c) => c.name)
                      : ["북한관 입장료", "가이드입장료", "북한책"]
                  }
                  value={expenseForm.expenseType}
                  onChange={(v) =>
                    setExpenseForm({ ...expenseForm, expenseType: v })
                  }
                  badgeFn={expTypeBadge}
                />
              </div>
              <div className="field">
                <label>결제유형 *</label>
                <SelectBtn
                  options={["현금", "법인카드"]}
                  value={expenseForm.paymentType}
                  onChange={(v) =>
                    setExpenseForm({ ...expenseForm, paymentType: v })
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
                  <label>금액 (1인) *</label>
                  <input
                    type="number"
                    placeholder="금액"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>인원 *</label>
                  <input
                    type="number"
                    placeholder="명"
                    value={expenseForm.headcount}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        headcount: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              {expenseForm.amount && expenseForm.headcount && (
                <div className="total-preview">
                  합계: <strong>{fmt(previewExpenseTotal())}</strong>
                </div>
              )}
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setExpenseModal({ mode: null })}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  {expenseModal.mode === "add" ? "추가" : "수정"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일비 모달 */}
      {dailyFeeModal.mode && (
        <div className="modal-bg">
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, calc(100vw - 32px))",
              boxSizing: "border-box",
            }}
          >
            <h3 className="modal-title">
              {dailyFeeModal.mode === "add" ? "일비 추가" : "일비 수정"}
            </h3>
            <form onSubmit={handleSubmitFee} className="modal-form">
              <div className="field">
                <label>날짜 *</label>
                <input
                  type="date"
                  value={dailyFeeForm.date}
                  onChange={(e) =>
                    setDailyFeeForm({ ...dailyFeeForm, date: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>일비 금액 *</label>
                <input
                  type="number"
                  placeholder="금액 입력"
                  value={dailyFeeForm.amount}
                  onChange={(e) =>
                    setDailyFeeForm({ ...dailyFeeForm, amount: e.target.value })
                  }
                />
              </div>
              {dailyFeeForm.amount && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    padding: "12px",
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
                    <span>신고액 (3.3%)</span>
                    <span style={{ color: "#e53e3e", fontWeight: 600 }}>
                      -{" "}
                      {Math.round(
                        Number(dailyFeeForm.amount) * TAX_RATE,
                      ).toLocaleString()}
                      원
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>실수령액</span>
                    <span style={{ color: "#059669", fontWeight: 700 }}>
                      {(
                        Number(dailyFeeForm.amount) -
                        Math.round(Number(dailyFeeForm.amount) * TAX_RATE)
                      ).toLocaleString()}
                      원
                    </span>
                  </div>
                </div>
              )}
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setDailyFeeModal({ mode: null })}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  {dailyFeeModal.mode === "add" ? "추가" : "수정"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
