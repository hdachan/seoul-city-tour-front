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
  getPersonalFuelBalance,
}) {
  const [startMeter, setStartMeter] = useState(null); // null = 로딩 중
  const [overall, setOverall] = useState({ totalDist: 0, totalFuelL: 0 });
  const [balance, setBalance] = useState(null); // 개인주유 이월 잔액 (서버 계산)

  // 개인주유 잔액: 운행 기록이 바뀌면(driving) 다시 계산
  useEffect(() => {
    setBalance(null);
    getPersonalFuelBalance(year, month)
      .then((r) => setBalance(r.data))
      .catch(() => setBalance(null));
  }, [year, month, driving, getPersonalFuelBalance]);

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
            // 넣어야 할 개인주유 (강조)
            <div
              style={{
                background: "#ede9fe",
                border: "1.5px solid #c4b5fd",
                borderRadius: "10px",
                padding: "16px",
                textAlign: "center",
              }}
            >
              <div
                style={{ fontSize: "13px", fontWeight: 700, color: "#6d28d9" }}
              >
                ⛽ 넣어야 할 개인주유
              </div>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "#5b21b6",
                  margin: "4px 0",
                }}
              >
                {fmtL(needL)}
                <span
                  style={{ fontSize: "16px", fontWeight: 700, marginLeft: "4px" }}
                >
                  L
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#7c6aa8" }}>
                개인사용 {fmt(personalKm)}km ÷ 평균연비 {fmtL(kmPerL)}km/L (
                {effBasis})
              </div>
            </div>
          )}

          {/* 이월 잔액 (서버에서 운행 기록으로 계산, 저장 없음) */}
          {balance?.current && (
            <div style={{ marginTop: "12px" }}>
              <BalanceRow
                label="지난달에서 넘어온 양"
                value={balance.carriedIn}
                signed
              />
              <BalanceRow
                label="이번 달 넣어야 할 양"
                value={-balance.current.needL}
                signed
              />
              <BalanceRow
                label="이번 달 넣은 양"
                value={balance.current.putL}
                signed
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "6px",
                  paddingTop: "10px",
                  borderTop: "1.5px solid #e5e7eb",
                  fontWeight: 800,
                  fontSize: "15px",
                  color: balance.balance >= 0 ? "#065f46" : "#b91c1c",
                }}
              >
                <span>
                  {balance.balance >= 0
                    ? "다음 달로 넘어가는 양"
                    : "더 넣어야 할 양"}
                </span>
                <span>
                  {balance.balance >= 0
                    ? `+${fmtL(balance.balance)} L`
                    : `${fmtL(-balance.balance)} L`}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "6px" }}>
                {balance.startMonth.replace("-", "년 ")}월부터 누적 계산
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 이월 계산 한 줄 (+ 초록 / - 빨강)
function BalanceRow({ label, value, signed }) {
  const v = Number(value || 0);
  const text = v.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        color: "#555",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontWeight: 700,
          color: v > 0 ? "#065f46" : v < 0 ? "#b91c1c" : "#555",
        }}
      >
        {signed && v > 0 ? "+" : ""}
        {text} L
      </span>
    </div>
  );
}
