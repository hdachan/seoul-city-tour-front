import { useState } from "react";
import { fmtWon, formatCard } from "./salesShared";
import DateField from "./DateField";
import "./sales.css";

// 💳 법인카드 지출내역 추가/수정 입력창 (영업 정산 · 영업 정산관리 공용)
//   form / setForm  : 입력값 (화면마다 자기 상태를 넘김)
//   dateMin/dateMax : 고를 수 있는 날짜 범위 (없으면 제한 없음)
//   dateChoices     : 날짜 목록 (잠긴 날은 못 고름) – 있으면 달력 대신 목록
//   mode            : "개인" / "법인" – 카테고리는 화면에서 안 고름 (추가 버튼에 따라 개인사용 / 법인으로 저장)
//   사용 이유(note) 는 항상 필수
export default function ReceiptModal({
  form,
  setForm,
  isEdit,
  mode,
  error,
  onClose,
  onSubmit,
  dateMin,
  dateMax,
  dateChoices,
}) {
  // 총금액(부가세 포함) → 공급가액 · 부가세 미리보기
  const total = Number(form.amount || 0);
  const supply = total ? Math.round(total / 1.1) : 0;
  const vat = total ? total - supply : 0;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const [reasonError, setReasonError] = useState("");
  const handleSubmit = (e) => {
    if (!(form.note || "").trim()) {
      e.preventDefault();
      setReasonError("사용 이유를 적어주세요.");
      return;
    }
    setReasonError("");
    onSubmit(e);
  };

  return (
    <div className="sl-modal-bg">
      <div className="sl-modal sl-modal-receipt">
        <div className="sl-modal-header">
          <h3 className="sl-modal-title">
            {mode ? `${mode} ` : ""}지출내역 {isEdit ? "수정" : "추가"}
          </h3>
          <button className="sl-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="sl-modal-form">
          <div className="sl-field">
            <label>날짜</label>
            <DateField
              value={form.date}
              choices={dateChoices}
              min={dateMin}
              max={dateMax}
              onChange={(v) => setForm((f) => ({ ...f, date: v }))}
            />
          </div>
          {/* 사용 이유 (필수) – 카테고리 칸 대신 */}
          <div className="sl-field">
            <label>사용 이유 *</label>
            <input
              type="text"
              placeholder="어떤 이유로 사용했는지 적어주세요"
              value={form.note || ""}
              onChange={set("note")}
              pattern=".*\S.*"
              title="사용 이유를 적어주세요"
              required
            />
            <p className="sl-hint is-info">
              주유는 여기 말고 운행일지의 ⛽ 주유 추가에 적어주세요.
            </p>
          </div>
          <div className="sl-field">
            <label>신용카드 번호</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1234-5678-9012-3456"
              value={form.content || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: formatCard(e.target.value) }))
              }
            />
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
            <input
              type="text"
              value={form.companyName || ""}
              onChange={set("companyName")}
            />
          </div>
          {(reasonError || error) && <p className="sl-field-error">⚠ {reasonError || error}</p>}
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
