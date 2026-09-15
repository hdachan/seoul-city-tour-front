import { useEffect, useState } from "react";
import axios from "axios";
import "./GuideStatsContent.css";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const fmt = (n) => Number(n).toLocaleString();

const now = new Date();
const thisYear = now.getFullYear();
const thisMonth = now.getMonth() + 1;

export default function GuideStatsContent() {
  const username = sessionStorage.getItem("username");
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(thisMonth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showDailyFees, setShowDailyFees] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState(null);
  const [expandedTour, setExpandedTour] = useState(null);

  const loadStats = () => {
    setLoading(true);
    setError("");
    axios
      .get(`${BASE_URL}/guide-form/stats`, {
        params: { username, year, month },
        ...authHeader(),
      })
      .then((r) => setStats(r.data))
      .catch(() => setError("데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, [year, month]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [thisYear - 1, thisYear, thisYear + 1];

  return (
    <div className="stats-wrapper">
      <div className="gf-header">
        <div>
          <h2 className="gf-title">📊 내 통계</h2>
          <p className="gf-subtitle">{username}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "13px",
            }}
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
            style={{
              padding: "6px 10px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", padding: "12px", textAlign: "center" }}>
          ⚠ {error}
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>
          불러오는 중...
        </div>
      )}

      {stats && !loading && (
        <>
          {/* 요약 카드 */}
          <div className="stats-summary-grid">
            <div className="stats-card">
              <div className="stats-card-label">총 투어 횟수</div>
              <div className="stats-card-value">{stats.totalTours}회</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-label">총 인원</div>
              <div className="stats-card-value" style={{ fontSize: "16px" }}>
                어른 {stats.totalAdult}
                {stats.totalChild > 0 && ` / 아이 ${stats.totalChild}`}
                {stats.totalInfant > 0 && ` / 유아 ${stats.totalInfant}`}명
              </div>
            </div>
          </div>

          {/* 일비 - 합계만, 버튼으로 세부내역 */}
          {stats.dailyFees &&
            stats.dailyFees.length > 0 &&
            (() => {
              const totalFee = stats.dailyFees.reduce(
                (s, d) => s + d.amount,
                0,
              );
              const tax = Math.round(totalFee * 0.033);
              const actual = totalFee - tax;
              return (
                <div style={{ marginBottom: "20px" }}>
                  <div className="stats-section-header">
                    <h3 className="stats-section-title">일비</h3>
                    <button
                      onClick={() => setShowDailyFees((v) => !v)}
                      className="stats-toggle-btn"
                    >
                      {showDailyFees ? "▲ 숨기기" : "▼ 세부내역"}
                    </button>
                  </div>
                  <div className="stats-dailyfee-total">
                    실수령액: {fmt(actual)}원
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#a16207",
                        marginLeft: "12px",
                      }}
                    >
                      (원래 {fmt(totalFee)}원 - 3.3% {fmt(tax)}원)
                    </span>
                  </div>
                  {showDailyFees && (
                    <div
                      className="stats-table-wrap"
                      style={{ marginTop: "8px" }}
                    >
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>날짜</th>
                            <th style={{ textAlign: "right" }}>원래 금액</th>
                            <th style={{ textAlign: "right" }}>3.3% 신고액</th>
                            <th style={{ textAlign: "right" }}>실수령액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.dailyFees.map((d, i) => {
                            const t = Math.round(d.amount * 0.033);
                            return (
                              <tr key={i}>
                                <td style={{ color: "#888", fontSize: "12px" }}>
                                  {d.date}
                                </td>
                                <td className="td-right">{fmt(d.amount)}원</td>
                                <td
                                  className="td-right"
                                  style={{ color: "#dc2626" }}
                                >
                                  - {fmt(t)}원
                                </td>
                                <td
                                  className="td-right"
                                  style={{ color: "#059669", fontWeight: 600 }}
                                >
                                  {fmt(d.amount - t)}원
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                            <td style={{ fontWeight: 600 }}>합계</td>
                            <td
                              className="td-right"
                              style={{ fontWeight: 600 }}
                            >
                              {fmt(totalFee)}원
                            </td>
                            <td
                              className="td-right"
                              style={{ color: "#dc2626", fontWeight: 600 }}
                            >
                              - {fmt(tax)}원
                            </td>
                            <td
                              className="td-right"
                              style={{ color: "#059669", fontWeight: 700 }}
                            >
                              {fmt(actual)}원
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* 지출 내역 - 날짜/항목/인원, 클릭하면 상세 */}
          {stats.expenseList && stats.expenseList.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h3
                className="stats-section-title"
                style={{ marginBottom: "10px" }}
              >
                지출 내역
              </h3>
              <div className="stats-table-wrap">
                <table className="stats-table">
                  <colgroup>
                    <col style={{ width: "130px" }} />
                    <col />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "40px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>항목</th>
                      <th style={{ textAlign: "center" }}>인원</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.expenseList.map((e, i) => (
                      <>
                        <tr
                          key={i}
                          onClick={() =>
                            setExpandedExpense(expandedExpense === i ? null : i)
                          }
                          className="clickable"
                        >
                          <td style={{ color: "#888", fontSize: "12px" }}>
                            {i === 0 || stats.expenseList[i - 1].date !== e.date
                              ? e.date
                              : ""}
                          </td>
                          <td>{e.expenseType}</td>
                          <td className="td-center">
                            {e.headcount > 0 ? `${e.headcount}명` : "-"}
                          </td>
                          <td style={{ fontSize: "11px", color: "#aaa" }}>
                            {expandedExpense === i ? "▲" : "▼"}
                          </td>
                        </tr>
                        {expandedExpense === i && (
                          <tr key={`${i}-detail`}>
                            <td colSpan={4} className="stats-detail-td">
                              <div>투어: {e.tourName || "-"}</div>
                              <div>결제: {e.paymentType}</div>
                              <div>
                                금액: {fmt(e.amount)}원 × {e.headcount}명 ={" "}
                                {fmt(e.totalAmount)}원
                              </div>
                              {e.memo && <div>비고: {e.memo}</div>}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 투어별 통계 - 투어명/인원, 클릭하면 상세 */}
          <h3 className="stats-section-title" style={{ marginBottom: "10px" }}>
            투어별 통계
          </h3>
          {stats.tourStats && Array.from(stats.tourStats).length > 0 ? (
            <div className="stats-table-wrap">
              <table className="stats-table">
                <colgroup>
                  <col />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "40px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>투어이름</th>
                    <th style={{ textAlign: "center" }}>총 인원</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(stats.tourStats).map((t, i) => (
                    <>
                      <tr
                        key={i}
                        onClick={() =>
                          setExpandedTour(expandedTour === i ? null : i)
                        }
                        className="clickable"
                      >
                        <td style={{ fontWeight: 500 }}>{t.tourName}</td>
                        <td className="td-center">
                          {t.totalAdult + t.totalChild + t.totalInfant}명
                        </td>
                        <td style={{ fontSize: "11px", color: "#aaa" }}>
                          {expandedTour === i ? "▲" : "▼"}
                        </td>
                      </tr>
                      {expandedTour === i && (
                        <tr key={`${i}-detail`}>
                          <td colSpan={3} className="stats-detail-td">
                            <div>횟수: {t.count}회</div>
                            <div>
                              어른: {t.totalAdult}명
                              {t.totalChild > 0
                                ? ` / 아이: ${t.totalChild}명`
                                : ""}
                              {t.totalInfant > 0
                                ? ` / 유아: ${t.totalInfant}명`
                                : ""}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="stats-empty">데이터가 없습니다.</div>
          )}
        </>
      )}
    </div>
  );
}
