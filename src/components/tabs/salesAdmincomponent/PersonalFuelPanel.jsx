// 🧮 개인주유 정산 (영업 월간 통계 · 영업 정산관리 통계 공용)
// 계산은 전부 서버(PersonalFuelService)에서 하고, 여기서는 표시만 함
//   balance: /personal-fuel-balance 응답 (undefined = 로딩 중, null = 실패)

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtL = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const BASIS_LABEL = {
  month: "이번 달 기준",
  overall: "이번 달 주유 기록이 없어 전체 기간 평균으로 계산",
};

export default function PersonalFuelPanel({ balance }) {
  const cur = balance?.current;

  let body;
  if (balance === undefined) {
    body = <Notice>불러오는 중...</Notice>;
  } else if (balance === null) {
    body = <Notice>개인주유 정산을 불러오지 못했습니다.</Notice>;
  } else if (!cur) {
    body = <Notice>이번 달 운행 기록이 없습니다.</Notice>;
  } else {
    body = (
      <>
        {cur.personalKm === 0 ? (
          <Notice>이번 달 개인사용 기록이 없습니다.</Notice>
        ) : cur.needUnknown ? (
          <Notice warn>
            개인사용 {fmt(cur.personalKm)}km가 있지만 평균연비를 계산할 주유
            기록(주유량 L)이 없어 넣어야 할 양을 계산하지 못했습니다.
          </Notice>
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
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#6d28d9" }}>
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
              {fmtL(cur.needL)}
              <span
                style={{ fontSize: "16px", fontWeight: 700, marginLeft: "4px" }}
              >
                L
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#7c6aa8" }}>
              개인사용 {fmt(cur.personalKm)}km ÷ 평균연비 {fmtL(cur.kmPerL)}km/L
              ({BASIS_LABEL[cur.basis] || ""})
            </div>
          </div>
        )}

        {/* 이월 잔액 */}
        <div style={{ marginTop: "12px" }}>
          <BalanceRow label="지난달에서 넘어온 양" value={balance.carriedIn} />
          <BalanceRow label="이번 달 넣어야 할 양" value={-cur.needL} />
          <BalanceRow label="이번 달 넣은 양" value={cur.putL} />
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
              {balance.balance >= 0 ? "다음 달로 넘어가는 양" : "더 넣어야 할 양"}
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
      </>
    );
  }

  return (
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
        {body}
      </div>
    </div>
  );
}

function Notice({ children, warn }) {
  return (
    <div
      style={{
        color: warn ? "#b45309" : "#888",
        background: warn ? "#fffbeb" : "transparent",
        borderRadius: "8px",
        padding: warn ? "10px 12px" : 0,
        lineHeight: 1.5,
      }}
    >
      {warn ? "⚠️ " : ""}
      {children}
    </div>
  );
}

// 이월 계산 한 줄 (+ 초록 / - 빨강)
function BalanceRow({ label, value }) {
  const v = Number(value || 0);
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
        {v > 0 ? "+" : ""}
        {fmtL(v)} L
      </span>
    </div>
  );
}
