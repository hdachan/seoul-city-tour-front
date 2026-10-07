import { useEffect, useState } from "react";

const fmt = (n) => Number(n || 0).toLocaleString();

// 영업 월간 통계 (관리자 summary 와 같은 기준)
// - 거리: 전월 마지막 미터기부터 날짜→미터기 순으로 구간 계산,
//         구간은 뒤쪽 기록의 구분에 붙음 (개인사용 → 개인, 그 외 → 업무)
// - 주유비: 주유(법인) / 개인주유 따로 합산
export default function SalesMonthlyStats({ year, month, driving, getPrevMeter }) {
  const [startMeter, setStartMeter] = useState(null); // null = 로딩 중

  useEffect(() => {
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    setStartMeter(null);
    getPrevMeter(firstDay)
      .then((r) => setStartMeter(r.data.prevMeter || 0))
      .catch(() => setStartMeter(0));
  }, [year, month, getPrevMeter]);

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
    </div>
  );
}
