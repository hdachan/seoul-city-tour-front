import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const toNum = (v) => Number(v || 0) || 0;
const fmt = (n) => toNum(n).toLocaleString();
const fmtWon = (n) => fmt(n) + "원";

const TYPE_STYLE = {
  업무: { bg: "#e8f0fe", color: "#1557b0" },
  주유: { bg: "#fef3c7", color: "#92400e" },
  휴가: { bg: "#fce7f3", color: "#9d174d" },
};

export default function SalesDrivingStats({ username, name, year, month }) {
  const [driving, setDriving] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [notes, setNotes] = useState({});
  const [prevMeter, setPrevMeter] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // 해당 월 첫 날 이전 마지막 미터기 조회
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    Promise.all([
      axios.get(`${BASE_URL}/sales-admin/driving`, {
        ...authHeader(),
        params: { salesUsername: username, year, month },
      }),
      axios.get(`${BASE_URL}/sales-admin/receipt`, {
        ...authHeader(),
        params: { salesUsername: username, year, month },
      }),
      axios.get(`${BASE_URL}/sales-admin/daily-notes`, {
        ...authHeader(),
        params: { salesUsername: username, year, month },
      }),
      axios.get(`${BASE_URL}/sales-admin/driving/prev-meter`, {
        ...authHeader(),
        params: { salesUsername: username, date: firstDay },
      }),
    ])
      .then(([drv, rec, nts, prev]) => {
        setDriving(Array.isArray(drv.data) ? drv.data : []);
        setReceipts(Array.isArray(rec.data) ? rec.data : []);
        setPrevMeter(prev.data.prevMeter || 0);
        const noteMap = {};
        (nts.data || []).forEach((n) => {
          noteMap[n.date] = n.note;
        });
        setNotes(noteMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username, year, month]);

  if (loading)
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#aaa" }}>
        로딩 중...
      </div>
    );
  if (!driving.length && !receipts.length)
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#bbb" }}>
        데이터가 없습니다.
      </div>
    );

  // 날짜+시간순 정렬 후 미터기로 거리 계산
  const allSorted = [...driving].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.arrivalTime) return 1;
    if (!b.arrivalTime) return -1;
    return a.arrivalTime.localeCompare(b.arrivalTime);
  });

  let globalLastMeter = prevMeter;
  const drivingWithDist = allSorted.map((d) => {
    const meter = toNum(d.meterReading);
    let dist = 0;
    if (meter > 0 && globalLastMeter > 0 && meter > globalLastMeter)
      dist = meter - globalLastMeter;
    if (meter > 0) globalLastMeter = meter;
    return { ...d, calcDist: dist };
  });

  const byDate = {};
  drivingWithDist.forEach((d) => {
    if (!byDate[d.date]) byDate[d.date] = [];
    byDate[d.date].push(d);
  });

  const dailyStats = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => {
      const meters = rows
        .map((r) => toNum(r.meterReading))
        .filter((m) => m > 0);
      const totalDist = rows.reduce((s, r) => s + r.calcDist, 0);
      const totalFuelL = rows.reduce((s, r) => s + toNum(r.fuelAmount), 0);
      const totalFuelC = rows.reduce((s, r) => s + toNum(r.fuelCost), 0);
      return {
        date,
        rows,
        startMeter: meters.length ? Math.min(...meters) : 0,
        endMeter: meters.length ? Math.max(...meters) : 0,
        totalDist,
        totalFuelL,
        totalFuelC,
        hasRefuel: rows.some((r) => toNum(r.fuelAmount) > 0),
        note: notes[date] || "",
      };
    });

  const totalDist = dailyStats.reduce((s, d) => s + d.totalDist, 0);
  const totalFuelL = dailyStats.reduce((s, d) => s + d.totalFuelL, 0);
  const totalFuelC = dailyStats.reduce((s, d) => s + d.totalFuelC, 0);
  const avgKmL = totalFuelL > 0 ? (totalDist / totalFuelL).toFixed(1) : "-";
  const totalReceipt = receipts.reduce((s, r) => s + toNum(r.totalAmount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a2e" }}>
          {name}님 · {year}년 {month}월 통계
        </h3>
      </div>

      {/* 합산 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}
      >
        {[
          {
            label: "총 운행거리",
            value: `${fmt(totalDist)}km`,
            color: "#1557b0",
            bg: "#eff6ff",
            icon: "🚗",
          },
          {
            label: "총 주유량",
            value: `${totalFuelL.toFixed(2)}L`,
            color: "#92400e",
            bg: "#fffbeb",
            icon: "⛽",
          },
          {
            label: "평균 연비",
            value: `${avgKmL}km/L`,
            color: "#059669",
            bg: "#f0fdf4",
            icon: "📊",
          },
          {
            label: "총 주유금액",
            value: fmtWon(totalFuelC),
            color: "#7c3aed",
            bg: "#faf5ff",
            icon: "💳",
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
                opacity: 0.8,
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

      {/* 법인카드 총액 */}
      {totalReceipt > 0 && (
        <div
          style={{
            background: "#eff6ff",
            borderRadius: "12px",
            border: "1px solid #bfdbfe",
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1557b0" }}>
            💳 법인카드 지출
          </span>
          <span style={{ fontSize: "20px", fontWeight: 800, color: "#1557b0" }}>
            {fmtWon(totalReceipt)}
          </span>
        </div>
      )}

      {/* 일별 상세 */}
      <div>
        <p
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: "10px",
          }}
        >
          📅 일별 상세
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {dailyStats.map((d) => (
            <div
              key={d.date}
              style={{
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #e8eaed",
                overflow: "hidden",
              }}
            >
              {/* 날짜 헤더 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 16px",
                  background: "#f8f9fb",
                  borderBottom: "1px solid #e8eaed",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#1a1a2e",
                  }}
                >
                  {month}월 {parseInt(d.date.split("-")[2])}일
                </span>
                <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
                  {d.totalDist > 0 && (
                    <span style={{ color: "#1557b0", fontWeight: 700 }}>
                      🚗 {fmt(d.totalDist)}km
                    </span>
                  )}
                  {d.hasRefuel && (
                    <span style={{ color: "#92400e", fontWeight: 700 }}>
                      ⛽ {d.totalFuelL.toFixed(2)}L
                    </span>
                  )}
                </div>
              </div>

              {/* 누계 바 */}
              <div
                style={{
                  display: "flex",
                  gap: "0",
                  borderBottom: "1px solid #f0f2f5",
                }}
              >
                {[
                  {
                    label: "전일누계",
                    value: `${fmt(d.startMeter)}km`,
                    color: "#555",
                  },
                  {
                    label: "금일누계",
                    value: `${fmt(d.totalDist)}km`,
                    color: "#1557b0",
                  },
                  {
                    label: "총누계",
                    value: `${fmt(d.endMeter)}km`,
                    color: "#059669",
                  },
                  ...(d.hasRefuel
                    ? [
                        {
                          label: "주유금액",
                          value: fmtWon(d.totalFuelC),
                          color: "#92400e",
                        },
                      ]
                    : []),
                ].map((r, i, arr) => (
                  <div
                    key={r.label}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      textAlign: "center",
                      borderRight:
                        i < arr.length - 1 ? "1px solid #f0f2f5" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#aaa",
                        marginBottom: "2px",
                        fontWeight: 600,
                      }}
                    >
                      {r.label}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: r.color,
                      }}
                    >
                      {r.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* 세부 기록 */}
              {d.rows.length > 0 && (
                <div
                  style={{
                    padding: "10px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {d.rows.map((r, i) => {
                    const tc = TYPE_STYLE[r.type] || {
                      bg: "#f3f4f6",
                      color: "#555",
                    };
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#ccc",
                            minWidth: "12px",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background: tc.bg,
                            color: tc.color,
                          }}
                        >
                          {r.type}
                        </span>
                        {r.arrivalTime && (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#1557b0",
                              background: "#e8f0fe",
                              padding: "1px 7px",
                              borderRadius: "6px",
                            }}
                          >
                            ⏰ {r.arrivalTime}
                          </span>
                        )}
                        {r.destination && (
                          <strong
                            style={{ fontSize: "12px", color: "#1a1a2e" }}
                          >
                            {r.destination}
                          </strong>
                        )}
                        {r.calcDist > 0 && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#1557b0",
                              fontWeight: 600,
                            }}
                          >
                            {fmt(r.calcDist)}km
                          </span>
                        )}
                        {r.purpose && !(r.notes && r.notes.length > 0) && (
                          <span style={{ fontSize: "11px", color: "#888" }}>
                            {r.purpose}
                          </span>
                        )}
                        {r.notes && r.notes.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px",
                              marginTop: "2px",
                              width: "100%",
                            }}
                          >
                            {r.notes.map((n, ni) => (
                              <div
                                key={ni}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                {n.time && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: "#1557b0",
                                      fontWeight: 700,
                                      background: "#e8f0fe",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {n.time}
                                  </span>
                                )}
                                <span
                                  style={{ fontSize: "11px", color: "#555" }}
                                >
                                  {n.content}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {toNum(r.fuelAmount) > 0 && (
                          <span style={{ fontSize: "11px", color: "#92400e" }}>
                            ⛽ {r.fuelAmount}L · {fmtWon(r.fuelCost)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 비고 */}
              {d.note && (
                <div
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    color: "#555",
                    background: "#fafafa",
                    borderTop: "1px solid #f0f2f5",
                  }}
                >
                  📝 {d.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
