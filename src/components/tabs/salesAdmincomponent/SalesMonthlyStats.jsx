import { useEffect, useState } from "react";
import PersonalFuelPanel from "./PersonalFuelPanel";

const fmt = (n) => Number(n || 0).toLocaleString();

// 영업 월간 통계
// - 주행거리(업무/개인사용)와 개인주유 정산은 서버(PersonalFuelService)가 계산한 값을 표시
//   (영업 정산관리 화면과 같은 값 · 계산 방식은 서버 한 곳에서만 관리)
// - 주유비/주유량은 이번 달 기록을 단순 합산
export default function SalesMonthlyStats({
  year,
  month,
  driving,
  getPersonalFuelBalance,
}) {
  const [balance, setBalance] = useState(undefined); // undefined = 로딩 중, null = 실패

  // 운행 기록이 바뀌면(driving) 다시 계산
  useEffect(() => {
    setBalance(undefined);
    getPersonalFuelBalance(year, month)
      .then((r) => setBalance(r.data))
      .catch(() => setBalance(null));
  }, [year, month, driving, getPersonalFuelBalance]);

  const workKm = balance?.current?.workKm || 0;
  const personalKm = balance?.current?.personalKm || 0;

  const sumBy = (type, key) =>
    driving
      .filter((d) => d.type === type)
      .reduce((s, d) => s + (Number(d[key]) || 0), 0);
  const companyFuel = sumBy("주유", "fuelCost");
  const personalFuel = sumBy("개인주유", "fuelCost");
  const personalFuelL = sumBy("개인주유", "fuelAmount");
  const fmtL = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

  const Card = ({ icon, label, value, unit, color, bg, extra }) => (
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
      {extra && (
        <div
          style={{ fontSize: "14px", fontWeight: 700, color, marginTop: "4px" }}
        >
          {extra}
        </div>
      )}
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
          extra={`${fmtL(personalFuelL)} L`}
        />
      </Section>

      <PersonalFuelPanel balance={balance} />
    </div>
  );
}
