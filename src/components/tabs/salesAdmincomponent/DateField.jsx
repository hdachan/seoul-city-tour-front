// 입력창 날짜 칸 (운행일지 · 주유 · 지출내역 공용)
//   choices 가 있으면 목록 – 잠긴 날은 🔒 회색으로 보이고 못 고름 (영업 정산)
//     choices: [{ value: "YYYY-MM-DD", label, disabled }]
//   없으면 기본 달력 (min / max 만, 영업 정산관리 – 관리자는 다 열림)
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
  // 지금 값이 목록에 없으면(예전 기록) 그대로 보이게 맨 앞에 붙임
  const list =
    value && !choices.some((c) => c.value === value)
      ? [{ value, label: value, disabled: true }, ...choices]
      : choices;
  return (
    <select
      className="sl-date-select"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {!value && <option value="">날짜 선택</option>}
      {list.map((c) => (
        <option key={c.value} value={c.value} disabled={c.disabled}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
