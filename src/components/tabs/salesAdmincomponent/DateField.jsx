import { useState } from "react";
import { toDateStr } from "../../../utils/dateUtils";

// 입력창 날짜 칸 (운행일지 · 주유 · 지출내역 공용)
//   choices 가 있으면 달력 – 잠긴 날은 🔒 회색으로 보이고 못 누름 (영업 정산)
//     choices: [{ value: "YYYY-MM-DD", disabled }]  (목록에 없는 날은 흐리게, 못 누름)
//   없으면 기본 달력 (min / max 만, 영업 정산관리 – 관리자는 다 열림)
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n) => String(n).padStart(2, "0");
const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const label = (s) => {
  const d = parse(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
};

export default function DateField({ value, onChange, choices, min, max, required }) {
  if (!choices)
    return (
      <input
        type="date"
        value={value || ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    );
  return <CalendarPick value={value} onChange={onChange} choices={choices} />;
}

function CalendarPick({ value, onChange, choices }) {
  const today = toDateStr(new Date());
  const byDate = Object.fromEntries(choices.map((c) => [c.value, c]));
  const months = [...new Set(choices.map((c) => c.value.slice(0, 7)))].sort();
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState((value || choices[choices.length - 1]?.value || "").slice(0, 7));

  const idx = months.indexOf(ym);
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const cells = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => `${ym}-${pad(i + 1)}`),
  ];

  const pick = (d) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <div className="sl-dp">
      <button
        type="button"
        className={`sl-dp-btn${open ? " is-open" : ""}`}
        onClick={() => {
          setYm((value || ym).slice(0, 7));
          setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        📅 {value ? label(value) : "날짜 선택"}
      </button>
      {open && (
        <div className="sl-dp-pop" role="dialog" aria-label="날짜 고르기">
          <div className="sl-dp-head">
            <button
              type="button"
              className="sl-dp-nav"
              disabled={idx <= 0}
              onClick={() => setYm(months[idx - 1])}
              aria-label="이전 달"
            >
              ‹
            </button>
            <b>
              {y}년 {m}월
            </b>
            <button
              type="button"
              className="sl-dp-nav"
              disabled={idx < 0 || idx >= months.length - 1}
              onClick={() => setYm(months[idx + 1])}
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
          <div className="sl-dp-grid">
            {WD.map((w, i) => (
              <span key={w} className={`sl-dp-w${i === 0 ? " is-sun" : i === 6 ? " is-sat" : ""}`}>
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`b${i}`} />;
              const c = byDate[d];
              const locked = c?.disabled;
              const can = c && !locked;
              const cls = [
                "sl-dp-day",
                !c && "is-out",
                locked && "is-locked",
                d === value && "is-sel",
                d === today && "is-today",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={d}
                  type="button"
                  className={cls}
                  data-date={d}
                  disabled={!can}
                  title={locked ? "잠긴 주라 고를 수 없어요" : undefined}
                  onClick={() => pick(d)}
                >
                  {Number(d.slice(8))}
                  {locked && <i>🔒</i>}
                </button>
              );
            })}
          </div>
          <p className="sl-dp-help">🔒 잠긴 주는 고를 수 없어요</p>
        </div>
      )}
    </div>
  );
}
