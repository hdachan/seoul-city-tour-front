import { useEffect, useState } from "react";
import axios from "axios";

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
    <div className="gf-wrapper">
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div className="summary-card">
              <div className="summary-label">총 투어 횟수</div>
              <div className="summary-value">{stats.totalTours}회</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">총 인원</div>
              <div className="summary-value" style={{ fontSize: "14px" }}>
                어른 {stats.totalAdult}
                {stats.totalChild > 0 && ` / 아이 ${stats.totalChild}`}
                {stats.totalInfant > 0 && ` / 유아 ${stats.totalInfant}`}명
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">총 수입</div>
              <div className="summary-value cash">
                {fmt(stats.totalIncome)}원
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">현금 수입</div>
              <div className="summary-value cash">{fmt(stats.cashTotal)}원</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">카드 수입</div>
              <div className="summary-value">{fmt(stats.cardTotal)}원</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">총 지출</div>
              <div className="summary-value expense">
                {fmt(stats.totalExpense)}원
              </div>
            </div>
            <div
              className={`summary-card ${stats.netIncome >= 0 ? "positive" : "negative"}`}
            >
              <div className="summary-label">순수익</div>
              <div
                className={`summary-value ${stats.netIncome >= 0 ? "plus" : "minus"}`}
              >
                {stats.netIncome >= 0 ? "+" : ""}
                {fmt(stats.netIncome)}원
              </div>
            </div>
          </div>

          {/* 투어별 통계 */}
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              marginBottom: "10px",
              color: "#1a1a2e",
            }}
          >
            투어별 통계
          </h3>
          {stats.tourStats && Array.from(stats.tourStats).length > 0 ? (
            <div className="gf-table-wrap">
              <table className="gf-table">
                <thead>
                  <tr>
                    <th>투어이름</th>
                    <th>횟수</th>
                    <th>어른</th>
                    <th>아이</th>
                    <th>유아</th>
                    <th>수입 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(stats.tourStats).map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{t.tourName}</td>
                      <td className="td-center">{t.count}회</td>
                      <td className="td-center">{t.totalAdult}명</td>
                      <td className="td-center">
                        {t.totalChild > 0 ? `${t.totalChild}명` : "-"}
                      </td>
                      <td className="td-center">
                        {t.totalInfant > 0 ? `${t.totalInfant}명` : "-"}
                      </td>
                      <td className="td-right total-cell">
                        {fmt(t.totalAmount)}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#bbb",
                fontSize: "13px",
              }}
            >
              데이터가 없습니다.
            </div>
          )}

          {/* 결제수단별 */}
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              margin: "20px 0 10px",
              color: "#1a1a2e",
            }}
          >
            결제수단별 수입
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
            }}
          >
            {[
              { label: "현금", value: stats.cashTotal, color: "#059669" },
              { label: "카드", value: stats.cardTotal, color: "#1557b0" },
              { label: "완불", value: stats.wanbul, color: "#854d0e" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #e8eaed",
                  padding: "14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    marginBottom: "6px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {fmt(item.value)}원
                </div>
                <div
                  style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}
                >
                  {stats.totalIncome > 0
                    ? Math.round((item.value / stats.totalIncome) * 100)
                    : 0}
                  %
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
