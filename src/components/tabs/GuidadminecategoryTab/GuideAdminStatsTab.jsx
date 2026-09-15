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

export default function GuideAdminStatsTab() {
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(thisMonth);
  const [stats, setStats] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStats = () => {
    setLoading(true);
    setError("");
    Promise.all([
      axios.get(`${BASE_URL}/guide-admin/stats`, {
        params: { year, month },
        ...authHeader(),
      }),
      axios.get(`${BASE_URL}/guide-admin/stats/daily`, {
        params: { year, month },
        ...authHeader(),
      }),
    ])
      .then(([r1, r2]) => {
        setStats(r1.data);
        setDailyStats(r2.data);
      })
      .catch(() => setError("데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, [year, month]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [thisYear - 1, thisYear, thisYear + 1];

  return (
    <div style={{ padding: "8px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>
          📊 가이드별 정산 통계
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
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
        <div style={{ color: "#e11d48", padding: "12px", textAlign: "center" }}>
          ⚠ {error}
        </div>
      )}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>
          불러오는 중...
        </div>
      )}

      {!loading && (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <colgroup>
              <col style={{ width: "15%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  "성명",
                  "일비",
                  "3.3% 신고액",
                  "실수령액(일비)",
                  "투어비용",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 14px",
                      textAlign: h === "성명" ? "left" : "right",
                      fontSize: "11px",
                      color: "#6b7280",
                      fontWeight: 700,
                      background: "#f9fafb",
                      borderBottom: "2px solid #e5e7eb",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "#9ca3af",
                    }}
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                stats.map((g, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td
                      style={{
                        padding: "12px 14px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {g.name}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      {fmt(g.dailyFee)}원
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        color: "#dc2626",
                      }}
                    >
                      - {fmt(g.tax)}원
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        color: "#059669",
                        fontWeight: 600,
                      }}
                    >
                      {fmt(g.actualDailyFee)}원
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: g.tourNet >= 0 ? "#059669" : "#dc2626",
                      }}
                    >
                      {g.tourNet >= 0 ? "+" : ""}
                      {fmt(g.tourNet)}원
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {stats.length > 0 && (
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    합계
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(stats.reduce((s, g) => s + g.dailyFee, 0))}원
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#dc2626",
                    }}
                  >
                    - {fmt(stats.reduce((s, g) => s + g.tax, 0))}원
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  >
                    {fmt(stats.reduce((s, g) => s + g.actualDailyFee, 0))}원
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                    }}
                  >
                    {(() => {
                      const t = stats.reduce((s, g) => s + g.tourNet, 0);
                      return `${t >= 0 ? "+" : ""}${fmt(t)}원`;
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 날짜별 통계 */}
      {!loading && dailyStats.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "12px",
              paddingLeft: "10px",
              borderLeft: "3px solid #4f46e5",
            }}
          >
            날짜별 수입/지출
          </h3>
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
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
                <col style={{ width: "10%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr>
                  {[
                    "날짜",
                    "현금수입",
                    "카드수입",
                    "지출",
                    "Total",
                    "현금정산액",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "11px 14px",
                        textAlign: h === "날짜" ? "left" : "right",
                        fontSize: "11px",
                        color: "#6b7280",
                        fontWeight: 700,
                        background: "#f9fafb",
                        borderBottom: "2px solid #e5e7eb",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((d, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td
                      style={{
                        padding: "11px 14px",
                        color: "#888",
                        fontSize: "12px",
                      }}
                    >
                      {d.date.slice(5)}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>
                      {fmt(d.cashIncome)}원
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>
                      {fmt(d.cardIncome)}원
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        textAlign: "right",
                        color: "#dc2626",
                      }}
                    >
                      {fmt(d.expense)}원
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: d.total >= 0 ? "#059669" : "#dc2626",
                      }}
                    >
                      {d.total >= 0 ? "+" : ""}
                      {fmt(d.total)}원
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: d.cashNet >= 0 ? "#059669" : "#dc2626",
                      }}
                    >
                      {d.cashNet >= 0 ? "+" : ""}
                      {fmt(d.cashNet)}원
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                >
                  <td style={{ padding: "11px 14px", fontWeight: 700 }}>
                    합계
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(dailyStats.reduce((s, d) => s + d.cashIncome, 0))}원
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                    }}
                  >
                    {fmt(dailyStats.reduce((s, d) => s + d.cardIncome, 0))}원
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#dc2626",
                    }}
                  >
                    {fmt(dailyStats.reduce((s, d) => s + d.expense, 0))}원
                  </td>
                  {(() => {
                    const total = dailyStats.reduce((s, d) => s + d.total, 0);
                    const cashNet = dailyStats.reduce(
                      (s, d) => s + d.cashNet,
                      0,
                    );
                    return (
                      <>
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: total >= 0 ? "#059669" : "#dc2626",
                          }}
                        >
                          {total >= 0 ? "+" : ""}
                          {fmt(total)}원
                        </td>
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: cashNet >= 0 ? "#059669" : "#dc2626",
                          }}
                        >
                          {cashNet >= 0 ? "+" : ""}
                          {fmt(cashNet)}원
                        </td>
                      </>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
