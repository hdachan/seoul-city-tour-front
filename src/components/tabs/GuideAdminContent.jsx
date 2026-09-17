import { useEffect, useState } from "react";
import GuideCategoryTab from "./GuidadminecategoryTab/GuideCategoryTab";
import {
  fetchAdminGuideList,
  fetchAdminLockStatus,
  toggleMonthLock,
  fetchTourNames,
  addTourName,
  deleteTourName,
  fetchExpenseCategories,
  fetchAdminExpenseCategories,
  addExpenseCategory,
  deleteExpenseCategory,
  fetchAdminGuideIncome,
  addAdminIncome,
  updateAdminIncome,
  deleteAdminIncome,
  fetchAdminGuideExpense,
  addAdminExpense,
  updateAdminExpense,
  deleteAdminExpense,
  fetchAdminGuideDailyFee,
  addAdminDailyFee,
  updateAdminDailyFee,
  deleteAdminDailyFee,
  fetchAdminSummary,
} from "../../api/auth";

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

export default function GuideAdminContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [guides, setGuides] = useState([]);
  const [summary, setSummary] = useState([]); // 카드뷰용 요약
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isLocked, setIsLocked] = useState(false);
  const [tourNames, setTourNames] = useState([]);
  const [newTourName, setNewTourName] = useState("");
  const [activeMainTab, setActiveMainTab] = useState("list");
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [selectedTourForExpense, setSelectedTourForExpense] = useState("");
  const [catSubTab, setCatSubTab] = useState("tour");
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dailyFees, setDailyFees] = useState([]);
  const [activeTab, setActiveTab] = useState("income");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showExtraPersons, setShowExtraPersons] = useState(false);
  const [incomeError, setIncomeError] = useState("");
  const [incomeModal, setIncomeModal] = useState({ mode: null, data: null });
  const [expenseModal, setExpenseModal] = useState({ mode: null, data: null });
  const [dailyFeeModal, setDailyFeeModal] = useState({
    mode: null,
    data: null,
  });
  const [incomeForm, setIncomeForm] = useState({});
  const [expenseForm, setExpenseForm] = useState({});
  const [dailyFeeForm, setDailyFeeForm] = useState({});

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    Promise.all([fetchAdminGuideList(), fetchTourNames()])
      .then(([g, t]) => {
        setGuides(g.data);
        setTourNames(t.data);
      })
      .catch(() => setError("데이터를 불러오지 못했습니다."));
    loadExpenseCategories();
  }, []);

  // 카드뷰 요약 로드
  useEffect(() => {
    const d = new Date(selectedDate);
    const y = selectedGuide ? d.getFullYear() : year;
    const m = selectedGuide ? d.getMonth() + 1 : month;
    if (!isNaN(y) && !isNaN(m)) {
      fetchAdminSummary(y, m)
        .then((res) => setSummary(res.data))
        .catch(() => {});
    }
  }, [selectedDate, year, month]);

  useEffect(() => {
    if (!selectedGuide) return;
    loadDetail();
  }, [selectedGuide, selectedDate]);

  const [allExpenseCategories, setAllExpenseCategories] = useState([]);
  const loadExpenseCategories = () => {
    fetchAdminExpenseCategories()
      .then((r) => {
        setAllExpenseCategories(r.data);
        setExpenseCategories(r.data);
      })
      .catch(() => {});
  };

  const loadDetail = async () => {
    const dt = new Date(selectedDate);
    const curYear = dt.getFullYear();
    const curMonth = dt.getMonth() + 1;
    if (isNaN(curYear) || isNaN(curMonth)) return;
    try {
      const [lockRes, i, e, d] = await Promise.all([
        fetchAdminLockStatus(selectedGuide.username, curYear, curMonth),
        fetchAdminGuideIncome(selectedGuide.username, curYear, curMonth),
        fetchAdminGuideExpense(selectedGuide.username, curYear, curMonth),
        fetchAdminGuideDailyFee(selectedGuide.username, curYear, curMonth),
      ]);
      setIsLocked(lockRes.data.locked);
      setIncomes(i.data);
      setExpenses(e.data);
      setDailyFees(d.data);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  const reloadSummary = () =>
    fetchAdminSummary(year, month)
      .then((res) => setSummary(res.data))
      .catch(() => {});

  const handleToggleLock = async (guide, currentLocked) => {
    const newLocked = !currentLocked;
    try {
      await toggleMonthLock(guide.username, year, month, newLocked);
      if (selectedGuide?.username === guide.username) setIsLocked(newLocked);
      setSuccess(
        newLocked
          ? `🔒 ${guide.name} ${month}월 정산 완료!`
          : `🔓 ${guide.name} ${month}월 잠금 해제`,
      );
      reloadSummary();
    } catch {
      setError("변경 실패");
    }
  };

  // CRUD handlers
  const openIncomeAdd = () => {
    setIncomeForm({
      tourName: "",
      representativeName: "",
      paymentType: "현금",
      amount: "",
      headcount: "",
      date: selectedDate,
      adult: "",
      child: "",
      childAmount: "",
      infant: "",
      memo: "",
      note: "",
      noteCustom: "",
      note: "",
      noteCustom: "",
    });
    setIncomeModal({ mode: "add" });
  };
  const openIncomeEdit = (row) => {
    setIncomeForm({
      tourName: row.tourName,
      representativeName: row.representativeName,
      paymentType: row.paymentType,
      amount: row.amount || "",
      headcount: row.headcount || "",
      date: row.date || selectedDate,
      adult: row.adult || "",
      child: row.child || "",
      childAmount: row.childAmount || "",
      infant: row.infant || "",
      memo: row.memo || "",
      note: row.note || "",
    });
    setIncomeModal({ mode: "edit", data: row });
  };
  const handleSubmitIncome = async (e) => {
    e.preventDefault();
    setIncomeError("");
    setError("");
    try {
      if (incomeModal.mode === "add") {
        await addAdminIncome({
          ...incomeForm,
          guideUsername: selectedGuide.username,
        });
        setSuccess("추가되었습니다.");
      } else {
        await updateAdminIncome(incomeModal.data.id, incomeForm);
        setSuccess("수정되었습니다.");
      }
      setIncomeModal({ mode: null });
      loadDetail();
      reloadSummary();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteIncome = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteAdminIncome(id);
      loadDetail();
      reloadSummary();
    } catch {
      setError("삭제 실패");
    }
  };

  const openExpenseAdd = () => {
    setExpenseCategories([]);
    setExpenseForm({
      tourName: "",
      expenseType: "",
      date: selectedDate,
      memo: "",
      amount: "",
      headcount: "",
      adult: "",
      child: "",
      childAmount: "",
      infant: "",
      memo: "",
      paymentType: "현금",
    });
    setExpenseModal({ mode: "add" });
  };
  const openExpenseEdit = (row) => {
    setExpenseForm({
      tourName: row.tourName || "",
      expenseType: row.expenseType,
      date: row.date || selectedDate,
      memo: row.memo || "",
      amount: row.amount,
      headcount: row.headcount,
      adult: row.adult || "",
      child: row.child || "",
      childAmount: row.childAmount || "",
      infant: row.infant || "",
      paymentType: row.paymentType,
    });
    setExpenseCategories([]); // 먼저 초기화
    if (row.tourName) {
      const t = tourNames.find((t) => t.name === row.tourName);
      fetchAdminExpenseCategories(t?.id)
        .then((r) => {
          setExpenseCategories(
            t
              ? r.data
              : r.data.filter(
                  (c) =>
                    c.tourNameId &&
                    tourNames.some(
                      (tn) =>
                        tn.name === row.tourName && tn.id === c.tourNameId,
                    ),
                ),
          );
          setExpenseModal({ mode: "edit", data: row });
        })
        .catch(() => {
          setExpenseCategories([]);
          setExpenseModal({ mode: "edit", data: row });
        });
    } else {
      setExpenseModal({ mode: "edit", data: row });
    }
  };
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (expenseModal.mode === "add") {
        await addAdminExpense({
          ...expenseForm,
          guideUsername: selectedGuide.username,
        });
        setSuccess("추가되었습니다.");
      } else {
        await updateAdminExpense(expenseModal.data.id, expenseForm);
        setSuccess("수정되었습니다.");
      }
      setExpenseModal({ mode: null });
      loadDetail();
      reloadSummary();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteExpense = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteAdminExpense(id);
      loadDetail();
      reloadSummary();
    } catch {
      setError("삭제 실패");
    }
  };

  const openFeeAdd = () => {
    setDailyFeeForm({ amount: "", date: today() });
    setDailyFeeModal({ mode: "add" });
  };
  const openFeeEdit = (row) => {
    setDailyFeeForm({ amount: row.amount, date: row.date });
    setDailyFeeModal({ mode: "edit", data: row });
  };
  const handleSubmitFee = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (dailyFeeModal.mode === "add") {
        await addAdminDailyFee({
          amount: Number(dailyFeeForm.amount),
          date: dailyFeeForm.date,
          guideUsername: selectedGuide.username,
        });
        setSuccess("추가되었습니다.");
      } else {
        await updateAdminDailyFee(
          dailyFeeModal.data.id,
          Number(dailyFeeForm.amount),
          dailyFeeForm.date,
        );
        setSuccess("수정되었습니다.");
      }
      setDailyFeeModal({ mode: null });
      loadDetail();
      reloadSummary();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteFee = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    try {
      await deleteAdminDailyFee(id);
      loadDetail();
      reloadSummary();
    } catch {
      setError("삭제 실패");
    }
  };

  const filteredIncomes = incomes.filter((r) => r.date === selectedDate);
  const filteredExpenses = expenses.filter((e) => e.date === selectedDate);
  const filteredDailyFees = dailyFees.filter((d) => d.date === selectedDate);

  const cashTotal = filteredIncomes
    .filter((r) => r.paymentType === "현금")
    .reduce((s, r) => s + (r.totalAmount || 0), 0);
  const expCashTotal = filteredExpenses
    .filter((e) => e.paymentType === "현금")
    .reduce((s, e) => s + (e.totalAmount || 0), 0);
  const netTotal = cashTotal - expCashTotal;
  const totalHeadcount = filteredIncomes.reduce(
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
      완불: { background: "#fef9c3", color: "#854d0e" },
      "그외-현금": { background: "#f3f4f6", color: "#555" },
      "그외-카드": { background: "#f3f4f6", color: "#555" },
    })[type] || { background: "#f3f4f6", color: "#555" };
  const expTypeBadge = (type) =>
    type === "북한관 입장료"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#ede9fe", color: "#5b21b6" };

  const filterBarJsx = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "1.2rem",
        background: "#fff",
        padding: "12px 16px",
        borderRadius: "12px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
      }}
    >
      {selectedGuide && (
        <button
          onClick={() => setSelectedGuide(null)}
          style={{
            padding: "7px 12px",
            border: "1.5px solid #e0e0e0",
            borderRadius: "8px",
            background: "#fff",
            cursor: "pointer",
            fontSize: "13px",
            color: "#555",
          }}
        >
          ← 목록
        </button>
      )}
      {!selectedGuide && (
        <>
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
        </>
      )}
      {selectedGuide && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              const nd = d.toISOString().split("T")[0];
              setSelectedDate(nd);
              setYear(d.getFullYear());
              setMonth(d.getMonth() + 1);
            }}
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
            onChange={(e) => {
              if (!e.target.value) return;
              const d = new Date(e.target.value);
              if (isNaN(d.getTime())) return;
              setSelectedDate(e.target.value);
              setYear(d.getFullYear());
              setMonth(d.getMonth() + 1);
            }}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "13px",
            }}
          />
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              const nd = d.toISOString().split("T")[0];
              setSelectedDate(nd);
              setYear(d.getFullYear());
              setMonth(d.getMonth() + 1);
            }}
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
      )}
      {selectedGuide && (
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#1a1a1a",
            marginLeft: "4px",
          }}
        >
          {selectedGuide.name}
        </span>
      )}
      {selectedGuide && (
        <button
          onClick={() => handleToggleLock(selectedGuide, isLocked)}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            border: "1.5px solid",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: 600,
            background: isLocked ? "#f0fff4" : "#fff0f0",
            color: isLocked ? "#276749" : "#e53e3e",
            borderColor: isLocked ? "#c6f6d5" : "#fed7d7",
          }}
        >
          {isLocked ? "✅ 정산 완료" : "⏳ 진행중"}
        </button>
      )}
    </div>
  );

  // ── 카드 뷰 ──
  if (!selectedGuide) {
    return (
      <div>
        <div className="gf-tab-bar" style={{ marginBottom: "16px" }}>
          <button
            className={`gf-tab ${activeMainTab === "list" ? "active" : ""}`}
            onClick={() => setActiveMainTab("list")}
          >
            📋 정산 목록
          </button>
          <button
            className={`gf-tab ${activeMainTab === "category" ? "active" : ""}`}
            onClick={() => setActiveMainTab("category")}
          >
            🏷 투어 카테고리
          </button>
          <button
            className={`gf-tab ${activeMainTab === "expense-category" ? "active" : ""}`}
            onClick={() => {
              setActiveMainTab("expense-category");
              loadExpenseCategories();
            }}
          >
            💸 지출 카테고리
          </button>
        </div>

        <GuideCategoryTab
          activeMainTab={activeMainTab}
          tourNames={tourNames}
          setTourNames={setTourNames}
          expenseCategories={expenseCategories}
          setExpenseCategories={setExpenseCategories}
          setSuccess={setSuccess}
          setError={setError}
        />

        {activeMainTab === "list" && (
          <div>
            {filterBarJsx}
            {error && (
              <div className="alert alert-error" onClick={() => setError("")}>
                ⚠ {error}
              </div>
            )}
            {success && (
              <div
                className="alert alert-success"
                onClick={() => setSuccess("")}
              >
                {success}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                gap: "14px",
              }}
            >
              {summary.map((g) => (
                <div
                  key={g.username}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "1.4rem",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    border: `2px solid ${g.locked ? "#c6f6d5" : g.hasData ? "#bfdbfe" : "#f0f0f0"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {/* 카드 위쪽 → 클릭하면 상세 이동 */}
                  <div
                    onClick={() =>
                      setSelectedGuide({ username: g.username, name: g.name })
                    }
                    style={{ cursor: "pointer", marginBottom: "12px" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "0.8")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#1a1a1a",
                        marginBottom: "10px",
                      }}
                    >
                      {g.name}
                    </div>

                    {g.hasData ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        <CountRow
                          label="수입"
                          count={g.incomeCount}
                          color="#059669"
                        />
                        <CountRow
                          label="지출"
                          count={g.expenseCount}
                          color="#e53e3e"
                        />
                        <CountRow
                          label="일비"
                          count={g.dailyFeeCount}
                          color="#1d4ed8"
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "10px",
                          background: "#fef3c7",
                          borderRadius: "8px",
                          textAlign: "center",
                          fontSize: "12px",
                          color: "#92400e",
                          fontWeight: 600,
                        }}
                      >
                        ✏️ 아직 입력 없음
                      </div>
                    )}
                  </div>

                  {/* 상태 버튼 하나만 - 현재 상태 표시, 클릭하면 토글 */}
                  <button
                    onClick={() => handleToggleLock(g, g.locked)}
                    style={{
                      width: "100%",
                      padding: "9px",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: 600,
                      background: g.locked ? "#d1fae5" : "#f3f4f6",
                      color: g.locked ? "#065f46" : "#888",
                    }}
                  >
                    {g.locked ? "✅ 정산 완료" : "⏳ 진행중"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 상세 뷰 ──
  return (
    <div>
      {/* 메인 탭 */}
      <div className="gf-tab-bar" style={{ marginBottom: "16px" }}>
        <button
          className={`gf-tab ${activeMainTab === "list" ? "active" : ""}`}
          onClick={() => setActiveMainTab("list")}
        >
          📋 정산 목록
        </button>
        <button
          className={`gf-tab ${activeMainTab === "category" ? "active" : ""}`}
          onClick={() => setActiveMainTab("category")}
        >
          🏷 투어 카테고리
        </button>
        <button
          className={`gf-tab ${activeMainTab === "expense-category" ? "active" : ""}`}
          onClick={() => {
            setActiveMainTab("expense-category");
            loadExpenseCategories();
          }}
        >
          💸 지출 카테고리
        </button>
      </div>

      {/* 카테고리 탭 */}
      {activeMainTab === "category" && (
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
              투어 카테고리 추가
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTourName.trim()) return;
                addTourName(newTourName.trim())
                  .then(() => {
                    setNewTourName("");
                    fetchTourNames().then((r) => setTourNames(r.data));
                    setSuccess("추가되었습니다.");
                  })
                  .catch((err) =>
                    setError(err.response?.data?.error || "추가 실패"),
                  );
              }}
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <input
                type="text"
                placeholder="투어 이름"
                value={newTourName}
                onChange={(e) => setNewTourName(e.target.value)}
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
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>투어명</th>
                  <th style={{ width: "70px" }}></th>
                </tr>
              </thead>
              <tbody>
                {tourNames.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      없음
                    </td>
                  </tr>
                ) : (
                  tourNames.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => {
                            if (window.confirm("삭제할까요?"))
                              deleteTourName(t.id)
                                .then(() => {
                                  fetchTourNames().then((r) =>
                                    setTourNames(r.data),
                                  );
                                  setSuccess("삭제되었습니다.");
                                })
                                .catch((err) =>
                                  setError(
                                    err.response?.data?.error || "삭제 실패",
                                  ),
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

      {activeMainTab === "expense-category" && (
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
              지출 카테고리 추가
            </h3>
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#444",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                투어 선택 *
              </label>
              <select
                value={selectedTourForExpense}
                onChange={(e) => {
                  setSelectedTourForExpense(e.target.value);
                  fetchAdminExpenseCategories(
                    e.target.value ? Number(e.target.value) : null,
                  )
                    .then((r) => setExpenseCategories(r.data))
                    .catch(() => {});
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="">투어를 선택하세요</option>
                {tourNames.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newExpenseCategory.trim()) return;
                if (!selectedTourForExpense) {
                  setError("투어를 먼저 선택해주세요.");
                  return;
                }
                addExpenseCategory(
                  newExpenseCategory.trim(),
                  Number(selectedTourForExpense),
                )
                  .then(() => {
                    setNewExpenseCategory("");
                    fetchAdminExpenseCategories(
                      Number(selectedTourForExpense),
                    ).then((r) => setExpenseCategories(r.data));
                    setSuccess("추가되었습니다.");
                  })
                  .catch((err) =>
                    setError(err.response?.data?.error || "추가 실패"),
                  );
              }}
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <input
                type="text"
                placeholder="카테고리 이름"
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
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
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>투어</th>
                  <th>카테고리명</th>
                  <th style={{ width: "70px" }}></th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      없음
                    </td>
                  </tr>
                ) : (
                  expenseCategories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => {
                            if (window.confirm("삭제할까요?"))
                              deleteExpenseCategory(c.id)
                                .then(() => {
                                  loadExpenseCategories();
                                  setSuccess("삭제되었습니다.");
                                })
                                .catch((err) =>
                                  setError(
                                    err.response?.data?.error || "삭제 실패",
                                  ),
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

      {activeMainTab === "list" && (
        <div>
          {filterBarJsx}
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "1rem",
              padding: "10px 16px",
              background: isLocked ? "#f0fff4" : "#fffbeb",
              border: `1px solid ${isLocked ? "#c6f6d5" : "#fde68a"}`,
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: isLocked ? "#276749" : "#92400e",
              }}
            >
              {isLocked ? "✅ 정산 완료된 달입니다." : "⏳ 정산 진행 중입니다."}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "12px",
              marginBottom: "1.2rem",
            }}
          >
            <div style={cardStyle("#eff6ff")}>
              <div style={labelStyle}>총 인원수</div>
              <div style={{ ...valueStyle, color: "#1557b0" }}>
                {totalHeadcount}명
              </div>
            </div>
            <div style={cardStyle("#e0e7ff")}>
              <div style={labelStyle}>현금 수입합계</div>
              <div style={{ ...valueStyle, color: "#059669" }}>
                {fmt(cashTotal)}
              </div>
            </div>
            <div style={cardStyle("#fde8e8")}>
              <div style={labelStyle}>지출합계 (현금)</div>
              <div style={{ ...valueStyle, color: "#e53e3e" }}>
                {fmt(expCashTotal)}
              </div>
            </div>
            <div style={cardStyle(netTotal >= 0 ? "#ecfdf5" : "#fff0f0")}>
              <div style={labelStyle}>토탈</div>
              <div
                style={{
                  ...valueStyle,
                  color: netTotal >= 0 ? "#059669" : "#e53e3e",
                }}
              >
                {netTotal >= 0 ? "+" : ""}
                {fmt(netTotal)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0",
            }}
          >
            <div className="gf-tab-bar" style={{ marginBottom: 0, flex: 1 }}>
              <button
                className={`gf-tab ${activeTab === "income" ? "active" : ""}`}
                onClick={() => setActiveTab("income")}
              >
                수입 ({filteredIncomes.length}건)
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
            <div style={{ paddingLeft: "12px" }}>
              {activeTab === "income" && (
                <button className="btn-primary" onClick={openIncomeAdd}>
                  ＋수입추가
                </button>
              )}
              {activeTab === "expense" && (
                <button className="btn-primary" onClick={openExpenseAdd}>
                  ＋ 지출추가
                </button>
              )}
              {activeTab === "dailyfee" && (
                <button className="btn-primary" onClick={openFeeAdd}>
                  ＋ 일비추가
                </button>
              )}
            </div>
          </div>

          {activeTab === "income" && (
            <div className="gf-table-wrap">
              <table className="gf-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>투어이름</th>
                    <th>대표자</th>
                    <th>결제</th>
                    <th>비고</th>
                    <th>금액(1인)</th>
                    <th>인원</th>
                    <th>합계</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty">
                        수입 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredIncomes.map((i) => (
                      <tr key={i.id}>
                        <td style={{ color: "#888", fontSize: "12px" }}>
                          {i.date}
                        </td>
                        <td>{i.tourName}</td>
                        <td>{i.representativeName || "-"}</td>
                        <td>
                          <span
                            className="pay-badge"
                            style={payBadge(i.paymentType)}
                          >
                            {i.paymentType}
                          </span>
                        </td>
                        <td className="td-right">
                          {Number(i.amount) > 0 && (
                            <div>{Number(i.amount).toLocaleString()}원</div>
                          )}
                          {Number(i.childAmount) > 0 && (
                            <div style={{ fontSize: "11px", color: "#888" }}>
                              아이 {Number(i.childAmount).toLocaleString()}원
                            </div>
                          )}
                          {!Number(i.amount) && !Number(i.childAmount) && (
                            <span>-</span>
                          )}
                        </td>
                        <td className="td-center">
                          {i.adult ? (
                            <div>
                              <div>어른 {i.adult}명</div>
                              {i.child > 0 && (
                                <div
                                  style={{ fontSize: "11px", color: "#888" }}
                                >
                                  아이 {i.child}명
                                </div>
                              )}
                              {i.infant > 0 && (
                                <div
                                  style={{ fontSize: "11px", color: "#888" }}
                                >
                                  유아 {i.infant}명
                                </div>
                              )}
                            </div>
                          ) : i.headcount ? (
                            i.headcount + "명"
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="td-right total-cell">
                          {i.totalAmount ? fmt(i.totalAmount) : "-"}
                        </td>
                        <td style={{ fontSize: "12px", color: "#888" }}>
                          {i.memo || "-"}
                        </td>
                        <td style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => openIncomeEdit(i)}
                            style={editBtnStyle}
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteIncome(i.id)}
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
          )}

          {activeTab === "expense" && (
            <div className="gf-table-wrap">
              <table className="gf-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>투어</th>
                    <th>항목</th>
                    <th>결제</th>
                    <th>금액(1인)</th>
                    <th>인원</th>
                    <th>합계</th>
                    <th>비고</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty">
                        지출 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id}>
                        <td style={{ color: "#888", fontSize: "12px" }}>
                          {e.date}
                        </td>
                        <td style={{ fontSize: "12px" }}>
                          {e.tourName || "-"}
                        </td>
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
                        <td style={{ fontSize: "12px", color: "#888" }}>
                          {e.memo || "-"}
                        </td>
                        <td style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => openExpenseEdit(e)}
                            style={editBtnStyle}
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
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
          )}

          {activeTab === "dailyfee" && (
            <div>
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
                          <td style={{ color: "#888", fontSize: "12px" }}>
                            {d.date}
                          </td>
                          <td
                            className="td-right"
                            style={{ fontWeight: 600, color: "#1d4ed8" }}
                          >
                            {fmt(d.amount)}
                          </td>
                          <td style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => openFeeEdit(d)}
                              style={editBtnStyle}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteFee(d.id)}
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

          {/* 수입 모달 */}
          {incomeModal.mode && (
            <div className="modal-bg">
              <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ minWidth: "360px", width: "100%", maxWidth: "480px" }}
              >
                <h3 className="modal-title">
                  수입 {incomeModal.mode === "add" ? "추가" : "수정"}
                </h3>
                <form onSubmit={handleSubmitIncome} className="modal-form">
                  <div className="field">
                    <label>날짜</label>
                    <input
                      type="date"
                      value={incomeForm.date || selectedDate}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        setIncomeForm((f) => ({ ...f, date: e.target.value }));
                        setYear(d.getFullYear());
                        setMonth(d.getMonth() + 1);
                        setSelectedDate(e.target.value);
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1.5px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>투어이름</label>
                    <select
                      value={incomeForm.tourName || ""}
                      onChange={(e) =>
                        setIncomeForm({
                          ...incomeForm,
                          tourName: e.target.value,
                        })
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
                      value={incomeForm.representativeName || ""}
                      onChange={(e) =>
                        setIncomeForm({
                          ...incomeForm,
                          representativeName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>결제유형</label>
                    <SelectBtn
                      options={["현금", "카드", "그외", "완불"]}
                      value={
                        ["그외-현금", "그외-카드"].includes(
                          incomeForm.paymentType,
                        )
                          ? "그외"
                          : incomeForm.paymentType || "현금"
                      }
                      onChange={(v) =>
                        setIncomeForm((f) => ({ ...f, paymentType: v }))
                      }
                    />
                  </div>
                  {["그외", "그외-현금", "그외-카드"].includes(
                    incomeForm.paymentType,
                  ) && (
                    <div className="field">
                      <label>그외 결제수단</label>
                      <SelectBtn
                        options={["그외-현금", "그외-카드"]}
                        value={incomeForm.paymentType}
                        onChange={(v) =>
                          setIncomeForm((f) => ({ ...f, paymentType: v }))
                        }
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
                            setIncomeForm((f) => ({
                              ...f,
                              adult: e.target.value,
                            }))
                          }
                        />
                      </div>
                      {showExtraPersons && (
                        <div style={{ marginTop: "8px" }}>
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
                          <div className="field" style={{ marginTop: "8px" }}>
                            <label>
                              유아{" "}
                              <span style={{ fontSize: "10px", color: "#aaa" }}>
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

                  {/* 현금/카드/그외 - 금액 + 어른 기본 + 아이/유아 토글 */}
                  {incomeForm.paymentType !== "완불" && (
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
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <div className="field">
                          <label>금액 (1인)</label>
                          <input
                            type="number"
                            value={incomeForm.amount || ""}
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
                        <div style={{ marginTop: "8px" }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "8px",
                              marginBottom: "8px",
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
                          </div>
                          <div className="field">
                            <label>
                              유아{" "}
                              <span style={{ fontSize: "10px", color: "#aaa" }}>
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

                  {/* 미리보기 */}
                  {incomeForm.paymentType !== "완불" &&
                    incomeForm.amount &&
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
                          <div style={{ color: "#555", fontSize: "12px" }}>
                            <div>
                              어른{" "}
                              {Number(incomeForm.amount || 0).toLocaleString()}
                              원 × {incomeForm.adult || 0}명
                            </div>
                            {Number(incomeForm.child || 0) > 0 && (
                              <div>
                                아이{" "}
                                {Number(
                                  incomeForm.childAmount || 0,
                                ).toLocaleString()}
                                원 × {incomeForm.child}명
                              </div>
                            )}
                            {Number(incomeForm.infant || 0) > 0 && (
                              <div>유아 {incomeForm.infant}명 (무료)</div>
                            )}
                          </div>
                          <strong
                            style={{ color: "#059669", fontSize: "15px" }}
                          >
                            ={" "}
                            {(
                              Number(incomeForm.amount || 0) *
                                Number(incomeForm.adult || 0) +
                              Number(incomeForm.childAmount || 0) *
                                Number(incomeForm.child || 0)
                            ).toLocaleString()}
                            원
                          </strong>
                        </div>
                      </div>
                    )}

                  {/* note 필드 - 그외 + DMZ/출렁다리 */}
                  {incomeForm.paymentType === "그외" &&
                    (incomeForm.tourName || "").match(/DMZ|출렁다리/i) && (
                      <div className="field">
                        <label>항목 선택</label>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          {["북한관 입장료", "가이드입장료", "기타"].map(
                            (opt) => (
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
                                  fontWeight:
                                    incomeForm.note === opt ? 700 : 400,
                                  background:
                                    incomeForm.note === opt
                                      ? "#e8f0fe"
                                      : "#fff",
                                  color:
                                    incomeForm.note === opt
                                      ? "#1557b0"
                                      : "#888",
                                  borderColor:
                                    incomeForm.note === opt
                                      ? "#1557b0"
                                      : "#e0e0e0",
                                }}
                              >
                                {opt}
                              </button>
                            ),
                          )}
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
                  {incomeForm.paymentType === "그외" &&
                    (incomeForm.tourName || "").match(/모닝|오후|투어/i) && (
                      <div className="field">
                        <label>기타</label>
                        <input
                          type="text"
                          placeholder="내용 입력"
                          value={incomeForm.note || ""}
                          onChange={(e) =>
                            setIncomeForm((f) => ({
                              ...f,
                              note: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                  {incomeError && (
                    <p className="field-error">⚠ {incomeError}</p>
                  )}
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
                style={{ minWidth: "360px", width: "100%", maxWidth: "480px" }}
              >
                <h3 className="modal-title">
                  지출 {expenseModal.mode === "add" ? "추가" : "수정"}
                </h3>
                <form onSubmit={handleSubmitExpense} className="modal-form">
                  <div className="field">
                    <label>날짜</label>
                    <input
                      type="date"
                      value={expenseForm.date || selectedDate}
                      onChange={(e) =>
                        setExpenseForm((f) => ({ ...f, date: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1.5px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>투어 선택</label>
                    <select
                      value={expenseForm.tourName || ""}
                      onChange={(e) => {
                        setExpenseForm((f) => ({
                          ...f,
                          tourName: e.target.value,
                          expenseType: "",
                        }));
                        const t = tourNames.find(
                          (t) => t.name === e.target.value,
                        );
                        if (t)
                          fetchAdminExpenseCategories(t.id)
                            .then((r) => setExpenseCategories(r.data))
                            .catch(() => {});
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "1.5px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    >
                      <option value="">선택하세요</option>
                      {tourNames.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {expenseForm.tourName && expenseCategories.length > 0 && (
                    <div className="field">
                      <label>항목</label>
                      <SelectBtn
                        options={expenseCategories.map((c) => c.name)}
                        value={expenseForm.expenseType || ""}
                        onChange={(v) =>
                          setExpenseForm((f) => ({ ...f, expenseType: v }))
                        }
                        badgeFn={expTypeBadge}
                      />
                    </div>
                  )}
                  <div className="field">
                    <label>결제유형</label>
                    <SelectBtn
                      options={["현금", "카드"]}
                      value={expenseForm.paymentType || "현금"}
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
                      <label>금액 (1인)</label>
                      <input
                        type="number"
                        value={expenseForm.amount || ""}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            amount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>인원</label>
                      <input
                        type="number"
                        value={expenseForm.headcount || ""}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            headcount: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>비고</label>
                    <input
                      type="text"
                      placeholder="비고 입력 (선택)"
                      value={expenseForm.memo || ""}
                      onChange={(e) =>
                        setExpenseForm((f) => ({ ...f, memo: e.target.value }))
                      }
                    />
                  </div>
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
                style={{ minWidth: "360px", width: "100%", maxWidth: "480px" }}
              >
                <h3 className="modal-title">
                  일비 {dailyFeeModal.mode === "add" ? "추가" : "수정"}
                </h3>
                <form onSubmit={handleSubmitFee} className="modal-form">
                  <div className="field">
                    <label>날짜</label>
                    <input
                      type="date"
                      value={dailyFeeForm.date || today()}
                      onChange={(e) =>
                        setDailyFeeForm({
                          ...dailyFeeForm,
                          date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>금액</label>
                    <input
                      type="number"
                      value={dailyFeeForm.amount || ""}
                      onChange={(e) =>
                        setDailyFeeForm({
                          ...dailyFeeForm,
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
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
      )}
    </div>
  );
}

// 입력 건수 행 컴포넌트
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
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ fontWeight: 600, color: count > 0 ? color : "#ccc" }}>
        {count > 0 ? `${count}건` : "미입력"}
      </span>
    </div>
  );
}

const selStyle = {
  padding: "8px 12px",
  border: "1.5px solid #e0e0e0",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
};
const cardStyle = (bg) => ({
  background: "#fff",
  borderRadius: "12px",
  padding: "1rem 1.2rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  borderLeft: `4px solid ${bg}`,
});
const labelStyle = { fontSize: "12px", color: "#888", marginBottom: "6px" };
const valueStyle = { fontSize: "20px", fontWeight: 700, color: "#1a1a1a" };
const editBtnStyle = {
  padding: "4px 10px",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  fontSize: "12px",
  cursor: "pointer",
};
