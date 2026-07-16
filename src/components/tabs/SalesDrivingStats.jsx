import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8080/api";
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});

const toNum = (v) => Number(v || 0) || 0;
const fmt = (n) => toNum(n).toLocaleString();
const fmtWon = (n) => fmt(n) + "원";

export default function SalesDrivingStats({ username, name, year, month }) {
  const [driving, setDriving] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
    ])
      .then(([drv, rec, nts]) => {
        setDriving(Array.isArray(drv.data) ? drv.data : []);
        setReceipts(Array.isArray(rec.data) ? rec.data : []);
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

  // 날짜별 그룹핑
  // 전체 데이터를 날짜+시간순 정렬 후 미터기로 거리 계산
  const allSorted = [...driving].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.arrivalTime) return 1;
    if (!b.arrivalTime) return -1;
    return a.arrivalTime.localeCompare(b.arrivalTime);
  });

  // 첫 번째 미터기 이전 거리는 0으로 처리
  let globalLastMeter = 0;
  const drivingWithDist = allSorted.map((d) => {
    const meter = toNum(d.meterReading);
    let dist = 0;
    if (meter > 0 && globalLastMeter > 0 && meter > globalLastMeter) {
      dist = meter - globalLastMeter;
    }
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

  // 전체 합산
  const totalDist = dailyStats.reduce((s, d) => s + d.totalDist, 0);
  const totalFuelL = dailyStats.reduce((s, d) => s + d.totalFuelL, 0);
  const totalFuelC = dailyStats.reduce((s, d) => s + d.totalFuelC, 0);
  const avgKmL = totalFuelL > 0 ? (totalDist / totalFuelL).toFixed(1) : "-";

  // 법인카드 총액
  const totalReceipt = receipts.reduce((s, r) => s + toNum(r.totalAmount), 0);

  return (
    <div>
      <p
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: "12px",
        }}
      >
        {name}님 · {year}년 {month}월 통계
      </p>

      {/* 월별 요약 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <StatCard
          label="총 운행거리"
          value={`${fmt(totalDist)}km`}
          color="#1557b0"
        />
        <StatCard
          label="총 주유량"
          value={`${totalFuelL.toFixed(2)}L`}
          color="#92400e"
        />
        <StatCard label="평균 연비" value={`${avgKmL}km/L`} color="#059669" />
        <StatCard
          label="총 주유금액"
          value={fmtWon(totalFuelC)}
          color="#7c3aed"
        />
      </div>

      {/* 법인카드 총액 */}
      {totalReceipt > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #e8eaed",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e" }}>
            💳 법인카드 지출
          </span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#1557b0" }}>
            {fmtWon(totalReceipt)}
          </span>
        </div>
      )}

      {/* 일별 상세 */}
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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {dailyStats.map((d) => (
          <div
            key={d.date}
            style={{
              background: "#fff",
              borderRadius: "10px",
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
                padding: "10px 14px",
                background: "#f8f9fb",
                borderBottom: "1px solid #e8eaed",
              }}
            >
              <span
                style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e" }}
              >
                {month}월 {parseInt(d.date.split("-")[2])}일
              </span>
              <div style={{ display: "flex", gap: "10px", fontSize: "12px" }}>
                {d.totalDist > 0 && (
                  <span style={{ color: "#1557b0", fontWeight: 600 }}>
                    {fmt(d.totalDist)}km
                  </span>
                )}
                {d.hasRefuel && (
                  <span style={{ color: "#92400e", fontWeight: 600 }}>
                    ⛽ {d.totalFuelL.toFixed(2)}L
                  </span>
                )}
              </div>
            </div>

            {/* 미터기 누계 */}
            <div
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
                borderBottom: "1px solid #f0f2f5",
              }}
            >
              <span style={{ color: "#888" }}>전일누계</span>
              <span style={{ fontWeight: 600 }}>{fmt(d.startMeter)}km</span>
              <span style={{ color: "#ccc" }}>→</span>
              <span style={{ color: "#888" }}>금일누계</span>
              <span style={{ fontWeight: 600, color: "#1557b0" }}>
                {fmt(d.totalDist)}km
              </span>
              <span style={{ color: "#ccc" }}>→</span>
              <span style={{ color: "#888" }}>총누계</span>
              <span style={{ fontWeight: 600, color: "#059669" }}>
                {fmt(d.endMeter)}km
              </span>
            </div>

            {/* 주유 */}
            {d.hasRefuel && (
              <div
                style={{
                  padding: "8px 14px",
                  background: "#fffbeb",
                  fontSize: "12px",
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  borderBottom: "1px solid #f0f2f5",
                }}
              >
                <span style={{ color: "#92400e", fontWeight: 600 }}>
                  ⛽ 주유
                </span>
                <span style={{ fontWeight: 600 }}>
                  {d.totalFuelL.toFixed(2)}L
                </span>
                <span style={{ color: "#888" }}>{fmtWon(d.totalFuelC)}</span>
                {d.rows.find((r) => r.fuelUnitPrice > 0) && (
                  <span style={{ color: "#aaa" }}>
                    단가{" "}
                    {fmt(
                      d.rows.find((r) => r.fuelUnitPrice > 0)?.fuelUnitPrice,
                    )}
                    원/L
                  </span>
                )}
              </div>
            )}

            {/* 세부 운행 기록 (여러 건일 때) */}
            {d.rows.length > 0 && (
              <div style={{ padding: "8px 14px" }}>
                {d.rows.map((r, i) => {
                  const typeColors = {
                    업무: { bg: "#e8f0fe", color: "#1557b0" },
                    주유: { bg: "#fef3c7", color: "#92400e" },
                    휴가: { bg: "#fce7f3", color: "#9d174d" },
                  };
                  const tc = typeColors[r.type] || {
                    bg: "#f3f4f6",
                    color: "#555",
                  };
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        gap: "6px",
                        fontSize: "11px",
                        padding: "3px 0",
                        alignItems: "center",
                        flexWrap: "wrap",
                        color: "#555",
                      }}
                    >
                      <span style={{ color: "#ccc" }}>{i + 1}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "99px",
                          background: tc.bg,
                          color: tc.color,
                        }}
                      >
                        {r.type}
                      </span>
                      {r.destination && (
                        <strong style={{ color: "#1a1a2e" }}>
                          {r.destination}
                        </strong>
                      )}
                      {r.arrivalTime && (
                        <span style={{ color: "#888" }}>{r.arrivalTime}</span>
                      )}
                      {toNum(r.distance) > 0 && (
                        <span style={{ color: "#1557b0", fontWeight: 600 }}>
                          {fmt(r.distance)}km
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
                  padding: "6px 14px",
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
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        border: "1px solid #e8eaed",
        padding: "12px 14px",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#888",
          marginBottom: "4px",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
