import { useEffect, useState } from "react";

const fmt = (n) => Number(n || 0).toLocaleString();

// 영업 월간 통계 (관리자 summary 와 같은 기준)
// - 거리: 전월 마지막 미터기부터 날짜→미터기 순으로 구간 계산,
//         구간은 뒤쪽 기록의 구분에 붙음 (개인사용 → 개인, 그 외 → 업무)
// - 주유비: 주유(법인) / 개인주유 따로 합산
// - 개인주유 정산: 평균연비 = 그 달 주행거리 ÷ 그 달 주유량(L) (회사 기존 방식)
//                 그 달 주유 기록이 없으면 전체 기간 평균연비로 대체
//                 넣어야 할 개인주유(L) = 개인사용 km ÷ 평균연비
export default function SalesMonthlyStats({
  year,
  month,
  driving,
  getPrevMeter,
  getFuelEfficiency,
}) {
  const [startMeter, setStartMeter] = useState(null); // null = 로딩 중
  const [overall, setOverall] = useState({ totalDist: 0, totalFuelL: 0 });

  useEffect(() => {
    const mm = String(month).padStart(2, "0");
    const firstDay = `${year}-${mm}-01`;
    const lastDay = `${year}-${mm}-${new Date(year, month, 0).getDate()}`;
    setStartMeter(null);
    Promise.all([
      getPrevMeter(firstDay).catch(() => null),
      getFuelEfficiency(lastDay).catch(() => null),
    ]).then(([prev, eff]) => {
      setOverall(eff?.data || { totalDist: 0, totalFuelL: 0 });
      setStartMeter(prev?.data?.prevMeter || 0);
    });
  }, [year, month, getPrevMeter, getFuelEfficiency]);

  if (startMeter === null)
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#aaa" }}>
        불러오는 중...
      </div>
    );

  const sorted = driving
    .filter((d) => d.meterReading > 0)
    .sort((a, b) =>
      a.date === b.date
        ? a.meterReading - b.meterReading
        : a.date.localeCompare(b.date),
    );
  let last = startMeter;
  let workKm = 0;
  let personalKm = 0;
  sorted.forEach((d) => {
    if (last > 0 && d.meterReading > last) {
      const seg = d.meterReading - last;
      if (d.type === "개인사용") personalKm += seg;
      else workKm += seg;
    }
    last = Math.max(last, d.meterReading);
  });

  const sumFuel = (type) =>
    driving
      .filter((d) => d.type === type)
      .reduce((s, d) => s + (Number(d.fuelCost) || 0), 0);
  const companyFuel = sumFuel("주유");
  const personalFuel = sumFuel("개인주유");

  // ── 개인주유 정산 (리터 기준) ──
  const sumLiters = (types) =>
    driving
      .filter((d) => types.includes(d.type))
      .reduce((s, d) => s + (Number(d.fuelAmount) || 0), 0);
  const monthFuelL = sumLiters(["주유", "개인주유"]);
  const personalFuelL = sumLiters(["개인주유"]);
  const monthDist = workKm + personalKm;

  let kmPerL = null;
  let effBasis = "";
  if (monthFuelL > 0 && monthDist > 0) {
    kmPerL = monthDist / monthFuelL;
    effBasis = "이번 달 기준";
  } else if (overall.totalFuelL > 0 && overall.totalDist > 0) {
    kmPerL = overall.totalDist / overall.totalFuelL;
    effBasis = "이번 달 주유 기록이 없어 전체 기간 평균으로 계산";
  }
  const needL = kmPerL ? personalKm / kmPerL : null;
  const diffL = needL !== null ? personalFuelL - needL : null;
  const fmtL = (n) => (Math.round(n * 10) / 10).toLocaleString();

  const Card = ({ icon, label, value, unit, color, bg }) => (
    <div
      style={{
        background: bg,
        borderRadius: "12px",
        padding: "18px 16px",
        border: `1px solid ${color}22`,
      }}
    >
      <div style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 800, color }}>
        {fmt(value)}
        <span style={{ fontSize: "14px", fontWeight: 600, marginLeft: "3px" }}>
          {unit}
        </span>
      </div>
    </div>
  );

  const Section = ({ title, total, unit, children }) => (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "10px",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a" }}>
          {title}
        </div>
        <div style={{ fontSize: "13px", color: "#888" }}>
          합계 {fmt(total)}
          {unit}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: "13px", color: "#888", marginBottom: "14px" }}>
        {year}년 {month}월 기준
      </div>

      <Section title="🚗 주행거리" total={workKm + personalKm} unit="km">
        <Card
          icon="💼"
          label="업무"
          value={workKm}
          unit="km"
          color="#1557b0"
          bg="#e8f0fe"
        />
        <Card
          icon="🙋"
          label="개인사용"
          value={personalKm}
          unit="km"
          color="#6d28d9"
          bg="#ede9fe"
        />
      </Section>

      <Section title="⛽ 주유비용" total={companyFuel + personalFuel} unit="원">
        <Card
          icon="🏢"
          label="주유 (법인)"
          value={companyFuel}
          unit="원"
          color="#92400e"
          bg="#fef3c7"
        />
        <Card
          icon="🙋"
          label="개인주유"
          value={personalFuel}
          unit="원"
          color="#9d174d"
          bg="#fce7f3"
        />
      </Section>

      {/* 개인주유 정산 */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "10px",
          }}
        >
          🧮 개인주유 정산
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e8eaed",
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
          }}
        >
          {personalKm === 0 ? (
            <div style={{ color: "#888" }}>
              이번 달 개인사용 기록이 없습니다.
            </div>
          ) : kmPerL === null ? (
            <div style={{ color: "#888" }}>
              평균연비를 계산할 주유 기록(주유량 L)이 없습니다.
            </div>
          ) : (
            <>
              <SettleRow
                label="평균 연비"
                value={`${fmtL(kmPerL)} km/L`}
                sub={effBasis}
              />
              <SettleRow
                label="넣어야 할 개인주유"
                value={`${fmtL(needL)} L`}
                sub={`개인사용 ${fmt(personalKm)}km ÷ ${fmtL(kmPerL)}km/L`}
              />
              <SettleRow
                label="실제 개인주유"
                value={`${fmtL(personalFuelL)} L`}
              />
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  background: diffL >= 0 ? "#d1fae5" : "#fee2e2",
                  color: diffL >= 0 ? "#065f46" : "#b91c1c",
                }}
              >
                {diffL >= 0
                  ? `✅ 충분 (${fmtL(diffL)}L 더 넣음)`
                  : `⚠️ 부족 (${fmtL(-diffL)}L 더 넣어야 함)`}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SettleRow({ label, value, sub }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "8px 0",
        borderBottom: "1px solid #f1f1f1",
        gap: "12px",
      }}
    >
      <div>
        <div style={{ color: "#555" }}>{label}</div>
        {sub && (
          <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}
