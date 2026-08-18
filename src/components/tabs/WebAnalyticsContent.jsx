import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const BASE_URL = process.env.REACT_APP_API_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const fmt = (n) => Number(n || 0).toLocaleString();

const CHANNEL_KO = {
  "Organic Search": "검색 (SEO)",
  Direct: "직접 방문",
  "Organic Social": "소셜 미디어",
  Referral: "외부 링크",
  Email: "이메일",
  "Paid Search": "유료 검색",
  Unassigned: "기타",
};

const CHANNEL_COLORS = [
  "#1557b0",
  "#059669",
  "#92400e",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#d97706",
];

const COUNTRY_FLAG = {
  "South Korea": "🇰🇷",
  "United States": "🇺🇸",
  Japan: "🇯🇵",
  China: "🇨🇳",
  Germany: "🇩🇪",
  France: "🇫🇷",
  "United Kingdom": "🇬🇧",
  Australia: "🇦🇺",
  Canada: "🇨🇦",
  Singapore: "🇸🇬",
};

function formatDate(dateStr) {
  return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

export default function WebAnalyticsContent() {
  const [days, setDays] = useState(30);
  const [visitors, setVisitors] = useState([]);
  const [sources, setSources] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `analytics_${days}_${today}`;

    // 오늘 캐시 있으면 바로 사용
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { visitors: v, sources: s, countries: c } = JSON.parse(cached);
        setVisitors(v);
        setSources(s);
        setCountries(c);
        setLoading(false);
        return;
      }
    } catch {}

    setLoading(true);
    setError(null);
    Promise.all([
      axios.get(`${BASE_URL}/analytics/visitors?days=${days}`, authHeader()),
      axios.get(`${BASE_URL}/analytics/sources?days=${days}`, authHeader()),
      axios.get(`${BASE_URL}/analytics/countries?days=${days}`, authHeader()),
    ])
      .then(([v, s, c]) => {
        setVisitors(v.data);
        setSources(s.data);
        setCountries(c.data);
        // 오늘 날짜로 캐시 저장
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              visitors: v.data,
              sources: s.data,
              countries: c.data,
            }),
          );
        } catch {}
      })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [days]);

  const totalUsers = visitors.reduce((s, d) => s + (d.users || 0), 0);
  const totalSessions = visitors.reduce((s, d) => s + (d.sessions || 0), 0);
  const maxSources = sources.reduce((s, d) => s + (d.sessions || 0), 0);

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "300px",
          color: "#aaa",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "24px" }}>⏳</span>
        GA4 데이터 불러오는 중...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          padding: "24px",
          background: "#fff0f0",
          borderRadius: "12px",
          color: "#dc2626",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "8px" }}>❌ 오류 발생</div>
        <div style={{ fontSize: "12px", fontFamily: "monospace" }}>{error}</div>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 헤더 + 필터 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#1a1a2e",
            margin: 0,
          }}
        >
          🌐 홈페이지 방문 현황
        </h2>
        <div style={{ display: "flex", gap: "6px" }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: "6px 14px",
                border: "1.5px solid",
                borderRadius: "8px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: days === d ? 700 : 400,
                background: days === d ? "#1557b0" : "#fff",
                color: days === d ? "#fff" : "#555",
                borderColor: days === d ? "#1557b0" : "#e0e0e0",
              }}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* 합산 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        {[
          {
            label: "총 방문자",
            value: fmt(totalUsers),
            color: "#1557b0",
            bg: "#eff6ff",
            icon: "👥",
          },
          {
            label: "총 방문 횟수",
            value: fmt(totalSessions),
            color: "#059669",
            bg: "#f0fdf4",
            icon: "📊",
          },
          {
            label: "하루 평균 방문자",
            value: fmt(Math.round(totalUsers / (days || 1))),
            color: "#7c3aed",
            bg: "#faf5ff",
            icon: "📈",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: s.bg,
              borderRadius: "12px",
              padding: "16px 18px",
              border: `1px solid ${s.color}22`,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: s.color,
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              {s.icon} {s.label}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* 일별 방문자 그래프 */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e8eaed",
          padding: "20px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: "16px",
          }}
        >
          📅 일별 방문자
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={visitors.map((d) => ({ ...d, label: formatDate(d.date) }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#aaa" }}
              interval={Math.ceil(visitors.length / 8)}
            />
            <YAxis tick={{ fontSize: 11, fill: "#aaa" }} />
            <Tooltip
              formatter={(v, n) => [
                fmt(v),
                n === "users" ? "순 방문자" : "총 방문 횟수",
              ]}
              contentStyle={{
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #e8eaed",
              }}
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#1557b0"
              strokeWidth={2}
              dot={false}
              name="순 방문자"
            />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              name="총 방문 횟수"
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            marginTop: "8px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "#1557b0",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                width: "20px",
                height: "2px",
                background: "#1557b0",
                display: "inline-block",
              }}
            />
            순 방문자
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                width: "20px",
                height: "2px",
                background: "#059669",
                display: "inline-block",
                borderBottom: "2px dashed #059669",
              }}
            />
            총 방문 횟수
          </span>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        {/* 유입 경로 */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e8eaed",
            padding: "20px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1a1a2e",
              marginBottom: "14px",
            }}
          >
            🔀 유입 경로
          </p>
          {sources.length === 0 ? (
            <div
              style={{ textAlign: "center", color: "#bbb", padding: "24px" }}
            >
              데이터 없음
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {sources.map((s, i) => {
                const pct =
                  maxSources > 0
                    ? Math.round((s.sessions / maxSources) * 100)
                    : 0;
                return (
                  <div key={s.channel}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        {CHANNEL_KO[s.channel] || s.channel}
                      </span>
                      <span style={{ fontSize: "12px", color: "#888" }}>
                        {fmt(s.sessions)}회 ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        background: "#f0f2f5",
                        borderRadius: "99px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
                          borderRadius: "99px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 국가별 */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e8eaed",
            padding: "20px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1a1a2e",
              marginBottom: "14px",
            }}
          >
            🌍 국가별 방문자 (Top 10)
          </p>
          {countries.length === 0 ? (
            <div
              style={{ textAlign: "center", color: "#bbb", padding: "24px" }}
            >
              데이터 없음
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {countries.map((c, i) => (
                <div
                  key={c.country}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 0",
                    borderBottom: "1px solid #f8f9fb",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#aaa",
                      minWidth: "16px",
                      textAlign: "right",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: "16px" }}>
                    {COUNTRY_FLAG[c.country] || "🌐"}
                  </span>
                  <span style={{ fontSize: "12px", flex: 1, color: "#374151" }}>
                    {c.country}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1557b0",
                    }}
                  >
                    {fmt(c.users)}명
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
