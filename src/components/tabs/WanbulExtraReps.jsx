// 완불 수입 추가: 대표자마다 같은 모양의 박스, ＋ 버튼으로 늘림 (가이드 정산 · 가이드 정산관리 공용)
// 대표자 1은 폼의 representativeName · adult · child · infant, 2부터는 form.extraReps 에 담김.
// 저장하면 사람마다 수입 한 건이 됨. (대표자 1만 있으면 기존처럼 한 건 저장)
import IncomeOptions, { optionsError } from "./IncomeOptions";
import { wholeNumberProps } from "../../utils/wholeNumberInput";

const newRep = () => ({ name: "", adult: "", child: "", infant: "", showKids: false, options: [] });

export const hasExtraReps = (form) =>
  form.paymentType === "완불" && (form.extraReps || []).length > 0;

const repsOf = (form) => [
  {
    name: form.representativeName || "",
    adult: form.adult,
    child: form.child,
    infant: form.infant,
    showKids: form.showKids,
    options: form.options,
  },
  ...(form.extraReps || []),
];

// 빠진 칸이 있으면 안내 문구, 없으면 null
export const extraRepsError = (form) => {
  const reps = repsOf(form);
  if (reps.some((r) => !r.name.trim())) return "대표자 이름을 모두 입력해주세요.";
  const count = (r) =>
    Number(r.adult || 0) + Number(r.child || 0) + Number(r.infant || 0);
  if (reps.some((r) => count(r) <= 0)) return "대표자마다 인원을 입력해주세요.";
  for (const r of reps) {
    const msg = optionsError(r.options, "완불");
    if (msg) return msg;
  }
  return null;
};

export const wanbulPayload = (form, isPrivate) => ({
  tourName: form.tourName,
  date: form.date,
  memo: form.memo || "",
  note: form.note || "",
  reps: repsOf(form).map((r) => ({
    representativeName: r.name.trim(),
    adult: r.adult || 0,
    child: isPrivate ? 0 : r.child || 0,
    infant: isPrivate ? 0 : r.infant || 0,
    options: r.options || [],
  })),
});

export default function WanbulExtraReps({ form, setForm, isPrivate, tourOptions = [] }) {
  const reps = repsOf(form);
  const extras = form.extraReps || [];

  const change = (idx, key, value) =>
    setForm((f) =>
      idx === 0
        ? { ...f, [key === "name" ? "representativeName" : key]: value }
        : {
            ...f,
            extraReps: (f.extraReps || []).map((r, i) =>
              i === idx - 1 ? { ...r, [key]: value } : r,
            ),
          },
    );
  const setExtras = (extraReps) => setForm((f) => ({ ...f, extraReps }));
  // 숨기면 그 박스의 아이 / 유아 값도 비움 (안 보이는 값이 저장되지 않게)
  const toggleKids = (idx) => {
    const open = !reps[idx].showKids;
    const patch = open ? { showKids: true } : { showKids: false, child: "", infant: "" };
    setForm((f) =>
      idx === 0
        ? { ...f, ...patch }
        : {
            ...f,
            extraReps: (f.extraReps || []).map((r, i) =>
              i === idx - 1 ? { ...r, ...patch } : r,
            ),
          },
    );
  };

  const number = (idx, key, label) => (
    <div className="field" style={{ marginTop: "8px" }}>
      <label>{label}</label>
      <input
        type="number"
        {...wholeNumberProps}
        placeholder="명"
        value={reps[idx][key] || ""}
        onChange={(e) => change(idx, key, e.target.value)}
      />
    </div>
  );

  return (
    <div style={{ marginTop: "8px" }}>
      {reps.map((r, idx) => (
        <div
          key={idx}
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <span>대표자 {idx + 1}</span>
            {idx > 0 && (
              <button
                type="button"
                aria-label={`대표자 ${idx + 1} 빼기`}
                onClick={() => setExtras(extras.filter((_, i) => i !== idx - 1))}
                style={{
                  background: "none",
                  border: "none",
                  color: "#c0392b",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ✕ 빼기
              </button>
            )}
          </div>
          <div className="field">
            <label>대표자이름</label>
            <input
              type="text"
              placeholder="대표자 이름"
              value={r.name}
              onChange={(e) => change(idx, "name", e.target.value)}
            />
          </div>
          {number(idx, "adult", isPrivate ? "인원" : "어른")}
          {!isPrivate && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                aria-label={`대표자 ${idx + 1} 아이/유아`}
                onClick={() => toggleKids(idx)}
                style={{
                  fontSize: "11px",
                  color: "#1557b0",
                  background: "none",
                  border: "1px solid #1557b0",
                  borderRadius: "6px",
                  padding: "3px 10px",
                  cursor: "pointer",
                }}
              >
                {r.showKids ? "▲ 아이/유아 숨기기" : "＋ 아이/유아 추가"}
              </button>
            </div>
          )}
          {r.showKids && !isPrivate && number(idx, "child", "아이 인원")}
          {r.showKids && !isPrivate && number(idx, "infant", "유아 (무료)")}
          <IncomeOptions
            options={r.options}
            onChange={(options) => change(idx, "options", options)}
            tourName={form.tourName}
            tourOptions={tourOptions}
            paymentType="완불"
            label={`대표자 ${idx + 1} `}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setExtras([...extras, newRep()])}
        style={{
          width: "100%",
          padding: "8px",
          fontSize: "12px",
          color: "#1557b0",
          background: "none",
          border: "1px dashed #1557b0",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        ＋ 대표자 추가
      </button>
    </div>
  );
}
