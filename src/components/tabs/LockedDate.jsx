// 입력창 날짜 칸: 바꿀 수 없음. 날짜는 화면 위 캘린더에서 고름 (가이드 정산 · 가이드 정산관리 공용)
const DAYS = "일월화수목금토";

// "2026-10-15" → "목" (날짜가 아니면 빈 글자)
export const weekdayOf = (date) => {
  const [y, m, d] = String(date).split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return Number.isNaN(day) ? "" : DAYS[day];
};

// "2026-10-15" → "2026-10-15 (목)"
export const withWeekday = (date) => {
  const day = weekdayOf(date);
  return day ? `${date} (${day})` : date;
};

export default function LockedDate({ value }) {
  return (
    <input
      type="text"
      value={withWeekday(value)}
      readOnly
      tabIndex={-1}
      title="날짜는 화면 위 캘린더에서 바꿀 수 있어요"
      style={{ background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
    />
  );
}
