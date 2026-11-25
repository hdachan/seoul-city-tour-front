import { useState } from "react";

// ⛽ 이번 달 주유 내역 (월간 통계 – 주유비용 아래, 눌러서 펼치기)
//   주유 (법인) · 개인주유 기록을 날짜 순으로: 날짜 · 구분 · 주유량 · 단가 · 금액 + 합계
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const day = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return `${m}/${d} (${WD[new Date(y, m - 1, d).getDay()]})`;
};
const won = (n) => `${Number(n || 0).toLocaleString()}원`;
const liter = (n) =>
  `${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}L`;

export default function FuelHistory({ driving }) {
  const [open, setOpen] = useState(false);
  const fuels = (driving || [])
    .filter((d) => d.type === "주유" || d.type === "개인주유")
    .sort((a, b) => (a.date === b.date ? (a.id || 0) - (b.id || 0) : a.date < b.date ? -1 : 1));
  const total = (type, key) =>
    fuels.filter((d) => d.type === type).reduce((s, d) => s + (Number(d[key]) || 0), 0);

  return (
    <div className="sl-fuel-hist">
      <button
        type="button"
        className="sl-fuel-hist-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        ⛽ 주유 내역 {open ? "접기 ▲" : `보기 (${fuels.length}건) ▼`}
      </button>
      {open &&
        (fuels.length === 0 ? (
          <div className="sl-fuel-hist-empty">이번 달 주유 기록이 없어요.</div>
        ) : (
          <div className="sl-scroll-x">
            <table className="sl-fuel-hist-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>구분</th>
                  <th className="sl-num">주유량</th>
                  <th className="sl-num">단가</th>
                  <th className="sl-num">금액</th>
                </tr>
              </thead>
              <tbody>
                {fuels.map((d) => (
                  <tr key={d.id} className={d.type === "개인주유" ? "is-personal" : ""}>
                    <td className="sl-nowrap">{day(d.date)}</td>
                    <td>
                      <span className={`sl-fuel-kind${d.type === "개인주유" ? " is-personal" : ""}`}>
                        {d.type === "개인주유" ? "개인주유" : "주유 (법인)"}
                      </span>
                    </td>
                    <td className="sl-num">{d.fuelAmount ? liter(d.fuelAmount) : "-"}</td>
                    <td className="sl-num">{d.fuelUnitPrice ? won(d.fuelUnitPrice) : "-"}</td>
                    <td className="sl-num sl-nowrap">
                      <b>{d.fuelCost ? won(d.fuelCost) : "-"}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {["주유", "개인주유"].map((t) => (
                  <tr key={t}>
                    <td colSpan={2}>{t === "주유" ? "주유 (법인) 합계" : "개인주유 합계"}</td>
                    <td className="sl-num">{liter(total(t, "fuelAmount"))}</td>
                    <td></td>
                    <td className="sl-num sl-nowrap">{won(total(t, "fuelCost"))}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        ))}
    </div>
  );
}
