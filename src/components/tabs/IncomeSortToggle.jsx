// 수입 목록 정렬: 넣은 순서 (인폼지 비교용, 기본) / 알파벳순 (대표자 이름)
const SORTS = ["넣은 순서", "알파벳순"];

export const DEFAULT_INCOME_SORT = SORTS[0];

export const sortIncomes = (list, sort) =>
  [...list].sort((a, b) => {
    if (sort === "알파벳순") {
      const nameA = (a.representativeName || "").trim();
      const nameB = (b.representativeName || "").trim();
      if (!nameA !== !nameB) return nameA ? -1 : 1; // 이름 없는 건 맨 아래
      const c = nameA.localeCompare(nameB, "en", { sensitivity: "base" });
      if (c !== 0) return c;
    }
    return a.id - b.id;
  });

export default function IncomeSortToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", margin: "8px 0" }}>
      {SORTS.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          style={{
            padding: "5px 12px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "16px",
            cursor: "pointer",
            border: `1.5px solid ${value === s ? "#1557b0" : "#d8dce3"}`,
            background: value === s ? "#1557b0" : "#fff",
            color: value === s ? "#fff" : "#666",
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
