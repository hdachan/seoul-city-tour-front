import { fmtWon } from "./salesShared";
import "./sales.css";

// 💳 법인카드 지출내역 추가/수정 입력창 (영업 정산 · 영업 정산관리 공용)
//   form / setForm  : 입력값 (화면마다 자기 상태를 넘김)
//   dateMin/dateMax : 고를 수 있는 날짜 범위 (없으면 제한 없음)
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
}) {
  // 총금액(부가세 포함) → 공급가액 · 부가세 미리보기
  const total = Number(form.amount || 0);
  const supply = total ? Math.round(total / 1.1) : 0;
  const vat = total ? total - supply : 0;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="sl-modal-bg">
      <div className="sl-modal sl-modal-receipt">
        <div className="sl-modal-header">
          <h3 className="sl-modal-title">지출내역 {isEdit ? "수정" : "추가"}</h3>
          <button className="sl-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="sl-modal-form">
          <div className="sl-field">
            <label>날짜</label>
            <input
              type="date"
              value={form.date || ""}
              min={dateMin}
              max={dateMax}
              onChange={set("date")}
            />
          </div>
          <div className="sl-field">
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
          <div className="sl-field">
            <label>신용카드 번호</label>
            <input type="text" value={form.content || ""} onChange={set("content")} />
          </div>
          <div className="sl-field">
            <label>총금액 *</label>
            <div className="sl-unit-input is-money">
              <input
                type="number"
                value={form.amount || ""}
                onChange={set("amount")}
                required
              />
              <span className="sl-unit">원</span>
            </div>
          </div>
          {total > 0 && (
            <div className="sl-vat-box">
              <div className="sl-vat-row is-first">
                <span className="sl-vat-label">공급가액</span>
                <strong className="sl-text-blue">{fmtWon(supply)}</strong>
              </div>
              <div className="sl-vat-row">
                <span className="sl-vat-label">VAT 10%</span>
                <strong className="sl-text-green">{fmtWon(vat)}</strong>
              </div>
            </div>
          )}
          <div className="sl-field">
            <label>
              사업자번호 <span className="sl-optional">(선택)</span>
            </label>
            <input
              type="text"
              placeholder="000-00-00000"
              value={form.businessNumber || ""}
              onChange={set("businessNumber")}
            />
          </div>
          <div className="sl-field">
            <label>
              상호 <span className="sl-optional">(선택)</span>
            </label>
            <input type="text" value={form.companyName || ""} onChange={set("companyName")} />
          </div>
          {error && <p className="sl-field-error">⚠ {error}</p>}
          <div className="sl-modal-btns">
            <button type="button" className="sl-btn-outline" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="sl-btn-primary">
              {isEdit ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
