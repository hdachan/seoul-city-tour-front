// 수입 입력창의 옵션 줄 (가이드 정산 · 가이드 정산관리 공용)
// 옵션은 투어 카테고리에서 만들고, 금액은 여기서 직접 적음. 한 건에 여러 개 고를 수 있음.
// 기타는 모든 투어에 기본으로 있고, 내용을 직접 적음 (적은 내용이 옵션 이름으로 저장됨).
// 옵션마다 현금 / 카드 / 교차(현금 + 카드 나눠 냄)를 고름. 처음 값은 수입 결제유형을 따름
// (현금 · 그외-현금 → 현금, 카드 · 그외-카드 → 카드, 그외-교차 → 교차, 완불 · 그외 → 직접 고름).
// 직접 누르기 전까지는 수입 결제유형을 바꾸면 옵션도 따라 바뀜.
import { useEffect, useRef, useState } from "react";
import { wholeNumberProps } from "../../utils/wholeNumberInput";

const ETC = "기타";
const PAYS = ["현금", "카드", "교차"];

// 직접 적는 줄: 기타를 골랐거나, 목록에 없는 이름 (기타로 저장된 것 · 카테고리에서 지운 옵션)
const isCustom = (o, tourOptions) =>
  o.custom || (!!o.optionName && !tourOptions.includes(o.optionName));

// 수입 결제유형에 맞는 옵션 결제 처음 값 (완불 · 그외는 "")
export const defaultPay = (paymentType) =>
  ({ 현금: "현금", "그외-현금": "현금", 카드: "카드", "그외-카드": "카드", "그외-교차": "교차" })[paymentType] || "";

export const optionsSum = (options = []) =>
  options.reduce((s, o) => s + Number(o.amount || 0), 0);

// 빠진 칸이 있으면 안내 문구, 없으면 null
export const optionsError = (options = [], paymentType) => {
  if (options.some((o) => o.custom && !(o.optionName || "").trim())) return "기타 내용을 입력해주세요.";
  if (options.some((o) => !(o.optionName || "").trim())) return "옵션을 선택해주세요.";
  if (options.some((o) => !PAYS.includes(o.paymentType) && !defaultPay(paymentType)))
    return "옵션마다 현금 / 카드 / 교차를 골라주세요.";
  if (options.some((o) => o.paymentType === "교차" && Number(o.amount || 0) <= 0))
    return "교차 옵션의 현금 / 카드 금액을 입력해주세요.";
  if (options.some((o) => Number(o.amount || 0) <= 0)) return "옵션금액을 입력해주세요.";
  return null;
};

const won = (n) => `${Number(n || 0).toLocaleString()}원`;

// "점심 10,000원 (현금)" · 교차는 "점심 10,000원 (교차: 현금 4,000원 / 카드 6,000원)"
export const optionLabel = (o) =>
  o.paymentType === "교차"
    ? `${o.optionName} ${won(o.amount)} (교차: 현금 ${won(o.cashAmount)} / 카드 ${won(o.cardAmount)})`
    : `${o.optionName} ${won(o.amount)} (${o.paymentType})`;

// 투어를 바꾸면 그 투어 옵션이 아니므로 비움
export const clearOptions = (form) => ({
  ...form,
  options: [],
  extraReps: (form.extraReps || []).map((r) => ({ ...r, options: [] })),
});

// 고른 투어의 옵션 이름 목록
export const useTourOptions = (tourName, fetcher) => {
  const [names, setNames] = useState([]);
  useEffect(() => {
    if (!tourName) {
      setNames([]);
      return undefined;
    }
    let live = true;
    fetcher(tourName)
      .then((r) => live && setNames(r.data.map((o) => o.name)))
      .catch(() => live && setNames([]));
    return () => {
      live = false;
    };
  }, [tourName, fetcher]);
  return names;
};

const payBtn = (active) => ({
  padding: "8px 10px",
  fontSize: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  border: active ? "1.5px solid #1557b0" : "1px solid #d8dce3",
  background: active ? "#eff6ff" : "#fff",
  color: active ? "#1557b0" : "#555",
  fontWeight: active ? 600 : 400,
});

export default function IncomeOptions({ options = [], onChange, tourName, tourOptions = [], paymentType, label = "", showSum = true }) {
  // 수입 결제유형이 바뀌면 직접 안 누른 옵션은 따라 바뀜
  const prevPay = useRef(paymentType);
  useEffect(() => {
    if (prevPay.current === paymentType) return;
    prevPay.current = paymentType;
    const next = defaultPay(paymentType);
    if (options.some((o) => !o.payTouched && o.paymentType !== next))
      onChange(options.map((o) => (o.payTouched ? o : { ...o, paymentType: next })));
  }, [paymentType]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tourName && options.length === 0) return null;
  const names = tourOptions.filter((n) => n !== ETC);
  const change = (idx, key, value) =>
    onChange(options.map((o, i) => (i === idx ? { ...o, [key]: value } : o)));
  // 교차 금액: 현금 + 카드 = 옵션금액
  const changeSplit = (idx, key, value) =>
    onChange(
      options.map((o, i) => {
        if (i !== idx) return o;
        const next = { ...o, [key]: value };
        return { ...next, amount: Number(next.cashAmount || 0) + Number(next.cardAmount || 0) || "" };
      }),
    );
  const choosePay = (idx, p) =>
    onChange(
      options.map((o, i) => {
        if (i !== idx) return o;
        if (p === "교차") return { ...o, paymentType: p, payTouched: true, cashAmount: o.amount || "", cardAmount: "" };
        return { ...o, paymentType: p, payTouched: true };
      }),
    );
  const pick = (idx, value) =>
    onChange(
      options.map((o, i) =>
        i === idx
          ? { ...o, custom: value === ETC, optionName: value === ETC ? "" : value }
          : o,
      ),
    );

  return (
    <div className="field" style={{ marginTop: "8px" }}>
      <label>옵션</label>
      {options.map((o, idx) => {
        const custom = isCustom(o, names);
        return (
          <div key={idx} style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
            <select
              aria-label={`${label}옵션 ${idx + 1}`}
              value={custom ? ETC : o.optionName || ""}
              onChange={(e) => pick(idx, e.target.value)}
              style={{ flex: "1 1 120px", minWidth: 0 }}
            >
              <option value="">옵션 선택</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value={ETC}>{ETC}</option>
            </select>
            {custom && (
              <input
                type="text"
                aria-label={`${label}기타 내용 ${idx + 1}`}
                placeholder="내용 입력"
                value={o.optionName || ""}
                onChange={(e) => change(idx, "optionName", e.target.value)}
                style={{ flex: "1 1 120px", minWidth: 0 }}
              />
            )}
            {o.paymentType === "교차" ? (
              <>
                {[
                  ["cashAmount", "현금"],
                  ["cardAmount", "카드"],
                ].map(([key, name]) => (
                  <span key={key} style={{ display: "flex", alignItems: "center", gap: "4px", flex: "1 1 110px", minWidth: 0 }}>
                    <span style={{ fontSize: "12px", color: "#555", whiteSpace: "nowrap" }}>{name}</span>
                    <input
                      type="number"
                      {...wholeNumberProps}
                      aria-label={`${label}옵션 ${name} ${idx + 1}`}
                      placeholder={`${name} 금액`}
                      value={o[key] || ""}
                      onChange={(e) => changeSplit(idx, key, e.target.value)}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  </span>
                ))}
              </>
            ) : (
              <input
                type="number"
                {...wholeNumberProps}
                aria-label={`${label}옵션금액 ${idx + 1}`}
                placeholder="옵션금액"
                value={o.amount || ""}
                onChange={(e) => change(idx, "amount", e.target.value)}
                style={{ flex: "1 1 90px", minWidth: 0 }}
              />
            )}
            {PAYS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={o.paymentType === p}
                aria-label={`${label}옵션 ${idx + 1} ${p}`}
                onClick={() => choosePay(idx, p)}
                style={payBtn(o.paymentType === p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              aria-label={`${label}옵션 ${idx + 1} 빼기`}
              onClick={() => onChange(options.filter((_, i) => i !== idx))}
              style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: "13px" }}
            >
              ✕
            </button>
          </div>
        );
      })}
      {tourName && (
        <button
          type="button"
          onClick={() => onChange([...options, { optionName: "", amount: "", paymentType: defaultPay(paymentType) }])}
          style={{
            width: "100%",
            padding: "7px",
            fontSize: "12px",
            color: "#1557b0",
            background: "none",
            border: "1px dashed #1557b0",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ＋ 옵션 추가
        </button>
      )}
      {showSum && options.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "8px",
            padding: "8px 12px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        >
          <span style={{ color: "#555" }}>옵션 합계</span>
          <strong style={{ color: "#059669", fontSize: "15px" }}>
            {optionsSum(options).toLocaleString()}원
          </strong>
        </div>
      )}
    </div>
  );
}

// 입력창 합계: 투어 금액 + 옵션을 한 칸에 줄마다 보여주고 맨 아래 총 합계
export const incomeTotalLines = (form, isPrivate) => {
  const lines = [];
  const pay = form.paymentType;
  if (pay === "그외-교차") {
    if (Number(form.cashAmount || 0) > 0) lines.push(["현금", Number(form.cashAmount)]);
    if (Number(form.cardAmount || 0) > 0) lines.push(["카드", Number(form.cardAmount)]);
  } else if (pay !== "완불" && form.amount && (form.adult || form.headcount)) {
    const amount = Number(form.amount);
    const adult = Number(form.adult || 0);
    if (isPrivate) {
      lines.push([`프라이빗 ${adult}명 (총액 그대로)`, amount]);
    } else {
      lines.push([`어른 ${won(amount)} × ${adult}명`, amount * adult]);
      const child = Number(form.child || 0);
      if (child > 0) lines.push([`아이 ${won(form.childAmount)} × ${child}명`, Number(form.childAmount || 0) * child]);
      if (Number(form.infant || 0) > 0) lines.push([`유아 ${form.infant}명 (무료)`, 0]);
    }
  }
  (form.options || []).forEach((o) => {
    if (Number(o.amount || 0) <= 0) return;
    const name = `옵션 ${(o.optionName || "").trim() || "(선택 안 함)"}`;
    lines.push([
      o.paymentType === "교차" ? `${name} (현금 ${won(o.cashAmount)} / 카드 ${won(o.cardAmount)})` : name,
      Number(o.amount),
    ]);
  });
  return lines;
};

export function IncomeTotalBox({ form, isPrivate }) {
  const lines = incomeTotalLines(form, isPrivate);
  if (lines.length === 0) return null;
  const total = lines.reduce((s, [, n]) => s + n, 0);
  return (
    <div
      data-testid="income-total"
      style={{
        marginTop: "8px",
        padding: "10px 14px",
        background: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: "8px",
        fontSize: "13px",
      }}
    >
      {lines.map(([label, n], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "12px", color: "#555", marginBottom: "4px" }}>
          <span>{label}</span>
          <span style={{ whiteSpace: "nowrap" }}>{won(n)}</span>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #86efac",
          marginTop: "6px",
          paddingTop: "6px",
        }}
      >
        <strong>총 합계</strong>
        <strong style={{ color: "#059669", fontSize: "16px" }}>{won(total)}</strong>
      </div>
    </div>
  );
}

// 표 · 카드에 보여주는 옵션 목록
export function OptionList({ options }) {
  if (!options || options.length === 0) return null;
  return (
    <div style={{ fontSize: "11px", color: "#666", fontWeight: 400, marginTop: "2px" }}>
      {options.map((o, i) => (
        <div key={i}>{optionLabel(o)}</div>
      ))}
    </div>
  );
}
