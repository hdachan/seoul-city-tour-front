import { fmtWon } from "./salesShared";

// 💳 법인카드 지출내역 추가/수정 입력창 (영업 정산 · 영업 정산관리 공용)
//   form / setForm  : 입력값 (화면마다 자기 상태를 넘김)
//   dateMin/dateMax : 고를 수 있는 날짜 범위 (없으면 제한 없음)
//   modalStyle      : 창 스타일 추가값
export default function ReceiptModal({
  form,
  setForm,
  isEdit,
  categories,
  error,
  onClose,
  onSubmit,
  dateMin,
  dateMax,
  modalStyle,
}) {
  const base = Number(form.amount || 0);
  const supplyPreview = base ? Math.round(base / 1.1) : 0;
  const vatPreview = base ? base - supplyPreview : 0;
  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));

  return (
    <div className="modal-bg" style={{ alignItems: "center" }}>
      <div
        className="modal"
        style={{ width: "440px", borderRadius: "14px", ...modalStyle }}
      >
        <div className="modal-header">
          <h3 className="modal-title" style={{ margin: 0 }}>
            지출내역 {isEdit ? "수정" : "추가"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="modal-form">
          <div className="field">
            <label>날짜</label>
            <input
              type="date"
              value={form.date || ""}
              min={dateMin}
              max={dateMax}
              onChange={set("date")}
            />
          </div>
          <div className="field">
            <label>카테고리</label>
            <select value={form.category || ""} onChange={set("category")}>
              {categories.length === 0 ? (
                <option value="">없음</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="field">
            <label>신용카드 번호</label>
            <input
              type="text"
              value={form.content || ""}
              onChange={set("content")}
            />
          </div>
          <div className="field">
            <label>총금액 *</label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                value={form.amount || ""}
                onChange={set("amount")}
                style={{ width: "100%", paddingRight: "36px" }}
                required
              />
              <span style={unitSuffix}>원</span>
            </div>
          </div>
          {base > 0 && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#555" }}>공급가액</span>
                <strong style={{ color: "#1557b0" }}>
                  {fmtWon(supplyPreview)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>VAT 10%</span>
                <strong style={{ color: "#059669" }}>{fmtWon(vatPreview)}</strong>
              </div>
            </div>
          )}
          <div className="field">
            <label>
              사업자번호 <span style={optionalStyle}>(선택)</span>
            </label>
            <input
              type="text"
              placeholder="000-00-00000"
              value={form.businessNumber || ""}
              onChange={set("businessNumber")}
            />
          </div>
          <div className="field">
            <label>
              상호 <span style={optionalStyle}>(선택)</span>
            </label>
            <input
              type="text"
              value={form.companyName || ""}
              onChange={set("companyName")}
            />
          </div>
          {error && <p className="field-error">⚠ {error}</p>}
          <div className="modal-btns">
            <button type="button" className="btn-outline" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const optionalStyle = { color: "#aaa", fontSize: "11px", fontWeight: 400 };
export const unitSuffix = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "13px",
  color: "#888",
  fontWeight: 600,
  pointerEvents: "none",
};
