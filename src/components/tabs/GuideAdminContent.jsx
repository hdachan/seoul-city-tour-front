import { useEffect, useState } from "react";
import {
  fetchAdminGuideList,
  fetchAdminLockStatus,
  toggleMonthLock,
  fetchTourNames,
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

export default function GuideAdminContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [guides, setGuides] = useState([]);
  const [summary, setSummary] = useState([]); // 카드뷰용 요약
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [tourNames, setTourNames] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dailyFees, setDailyFees] = useState([]);
  const [activeTab, setActiveTab] = useState("income");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
  }, []);

  // 카드뷰 요약 로드
  useEffect(() => {
    fetchAdminSummary(year, month)
      .then((res) => setSummary(res.data))
      .catch(() => {});
  }, [year, month]);

  useEffect(() => {
    if (!selectedGuide) return;
    loadDetail();
  }, [selectedGuide, year, month]);

  const loadDetail = async () => {
    try {
      const [lockRes, i, e, d] = await Promise.all([
        fetchAdminLockStatus(selectedGuide.username, year, month),
        fetchAdminGuideIncome(selectedGuide.username, year, month),
        fetchAdminGuideExpense(selectedGuide.username, year, month),
        fetchAdminGuideDailyFee(selectedGuide.username, year, month),
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
    });
    setIncomeModal({ mode: "edit", data: row });
  };
  const handleSubmitIncome = async (e) => {
    e.preventDefault();
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
    setExpenseForm({
      expenseType: "북한관수수료",
      amount: "",
      headcount: "",
      paymentType: "현금",
    });
    setExpenseModal({ mode: "add" });
  };
  const openExpenseEdit = (row) => {
    setExpenseForm({
      expenseType: row.expenseType,
      amount: row.amount,
      headcount: row.headcount,
      paymentType: row.paymentType,
    });
    setExpenseModal({ mode: "edit", data: row });
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

  const cashTotal = incomes
    .filter((r) => r.paymentType === "현금")
    .reduce((s, r) => s + (r.totalAmount || 0), 0);
  const expCashTotal = expenses
    .filter((e) => e.paymentType === "현금")
    .reduce((s, e) => s + (e.totalAmount || 0), 0);
  const netTotal = cashTotal - expCashTotal;
  const totalDailyFee = dailyFees.reduce((s, d) => s + d.amount, 0);
  const taxAmount = Math.round(totalDailyFee * TAX_RATE);
  const actualDailyFee = totalDailyFee - taxAmount;

  const fmt = (n) => Number(n).toLocaleString() + "원";
  const payBadge = (type) =>
    ({
      현금: { background: "#d1fae5", color: "#065f46" },
      카드: { background: "#dbeafe", color: "#1e40af" },
      그외: { background: "#f3f4f6", color: "#555" },
    })[type] || { background: "#f3f4f6", color: "#555" };
  const expTypeBadge = (type) =>
    type === "북한관수수료"
      ? { background: "#fef3c7", color: "#92400e" }
      : { background: "#ede9fe", color: "#5b21b6" };
  const SelectBtn = ({ options, value, onChange, badgeFn }) => (
    <div style={{ display: "flex", gap: "8px" }}>
      {options.map((opt) => (
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
                : payBadge(opt)
              : { background: "#fff", color: "#555", borderColor: "#e0e0e0" }),
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const FilterBar = () => (
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
        <FilterBar />
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
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
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
    );
  }

  // ── 상세 뷰 ──
  return (
    <div>
      <FilterBar />
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
          style={{ fontWeight: 600, color: isLocked ? "#276749" : "#92400e" }}
        >
          {isLocked ? "✅ 정산 완료된 달입니다." : "⏳ 정산 진행 중입니다."}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: "12px",
          marginBottom: "1.2rem",
        }}
      >
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
            수입 ({incomes.length}건)
          </button>
          <button
            className={`gf-tab ${activeTab === "expense" ? "active" : ""}`}
            onClick={() => setActiveTab("expense")}
          >
            지출 ({expenses.length}건)
          </button>
          <button
            className={`gf-tab ${activeTab === "dailyfee" ? "active" : ""}`}
            onClick={() => setActiveTab("dailyfee")}
          >
            일비 ({dailyFees.length}건)
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
                <th>금액(1인)</th>
                <th>인원</th>
                <th>합계</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    수입 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                incomes.map((i) => (
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
                      {i.amount ? fmt(i.amount) : "-"}
                    </td>
                    <td className="td-center">
                      {i.headcount ? `${i.headcount}명` : "-"}
                    </td>
                    <td className="td-right total-cell">
                      {i.totalAmount ? fmt(i.totalAmount) : "-"}
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
                <th>항목</th>
                <th>결제</th>
                <th>금액(1인)</th>
                <th>인원</th>
                <th>합계</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    지출 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ color: "#888", fontSize: "12px" }}>
                      {e.date}
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
          {totalDailyFee > 0 && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "1rem 1.2rem",
                marginBottom: "1rem",
                marginTop: "1rem",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#92400e",
                  marginBottom: "10px",
                }}
              >
                💰 일비 정산 (3.3%)
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={labelStyle}>총 일비</div>
                  <div style={valueStyle}>{fmt(totalDailyFee)}</div>
                </div>
                <div>
                  <div style={labelStyle}>신고액</div>
                  <div style={{ ...valueStyle, color: "#e53e3e" }}>
                    - {fmt(taxAmount)}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>실수령액</div>
                  <div style={{ ...valueStyle, color: "#059669" }}>
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
                {dailyFees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      일비 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  dailyFees.map((d) => (
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
        <div
          className="modal-bg"
          onClick={() => setIncomeModal({ mode: null })}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              수입 {incomeModal.mode === "add" ? "추가" : "수정"}
            </h3>
            <form onSubmit={handleSubmitIncome} className="modal-form">
              <div className="field">
                <label>투어이름</label>
                <select
                  value={incomeForm.tourName || ""}
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
                  options={["현금", "카드", "그외"]}
                  value={incomeForm.paymentType || "현금"}
                  onChange={(v) =>
                    setIncomeForm({
                      ...incomeForm,
                      paymentType: v,
                      amount: "",
                      headcount: "",
                    })
                  }
                />
              </div>
              {(incomeForm.paymentType === "현금" ||
                incomeForm.paymentType === "카드") && (
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
                      value={incomeForm.amount || ""}
                      onChange={(e) =>
                        setIncomeForm({ ...incomeForm, amount: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>인원</label>
                    <input
                      type="number"
                      value={incomeForm.headcount || ""}
                      onChange={(e) =>
                        setIncomeForm({
                          ...incomeForm,
                          headcount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIncomeModal({ mode: null })}
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
        <div
          className="modal-bg"
          onClick={() => setExpenseModal({ mode: null })}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              지출 {expenseModal.mode === "add" ? "추가" : "수정"}
            </h3>
            <form onSubmit={handleSubmitExpense} className="modal-form">
              <div className="field">
                <label>항목</label>
                <SelectBtn
                  options={["북한관수수료", "가이드입장료"]}
                  value={expenseForm.expenseType || "북한관수수료"}
                  onChange={(v) =>
                    setExpenseForm({ ...expenseForm, expenseType: v })
                  }
                  badgeFn={expTypeBadge}
                />
              </div>
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
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
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
        <div
          className="modal-bg"
          onClick={() => setDailyFeeModal({ mode: null })}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
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
                    setDailyFeeForm({ ...dailyFeeForm, date: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>금액</label>
                <input
                  type="number"
                  value={dailyFeeForm.amount || ""}
                  onChange={(e) =>
                    setDailyFeeForm({ ...dailyFeeForm, amount: e.target.value })
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
