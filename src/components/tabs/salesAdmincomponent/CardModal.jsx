import { useState } from "react";
import { formatCard } from "./salesShared";
import "./sales.css";

// 💳 법인카드 번호 입력창 (영업 정산 첫 진입 · 영업 정산관리 수정 공용)
//   onSave(문자)  : 저장 (실패하면 throw → 서버 안내 문구 표시)
//   onClose      : 없으면 닫기/취소 버튼 없음 (입력해야만 들어갈 수 있음)
export default function CardModal({ name, initial, onSave, onClose }) {
  const [value, setValue] = useState(initial || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isFirst = !onClose;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const card = value.trim();
    if (!card) {
      setError("카드번호를 입력해주세요.");
      return;
    }
    if (card.replace(/\D/g, "").length < 15) {
      setError("카드번호 15~16자리를 입력해주세요.");
      return;
    }
    // 처음 입력은 본인이 다시 못 바꾸니 한 번 더 확인
    if (isFirst && !window.confirm(`카드번호를 ${card} 로 저장할까요?`)) return;
    setError("");
    setSaving(true);
    try {
      await onSave(card);
    } catch (err) {
      setError(err.response?.data?.error || "저장 실패");
      setSaving(false);
    }
  };

  return (
    <div className="sl-modal-bg">
      <div className="sl-modal sl-modal-start">
        <div className="sl-modal-header">
          <h3 className="sl-modal-title">
            {isFirst ? "💳 법인카드 번호를 등록해주세요" : `카드번호 수정${name ? ` · ${name}` : ""}`}
          </h3>
          {onClose && (
            <button className="sl-modal-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="sl-modal-form">
          {isFirst && (
            <p className="sl-start-desc">
              사용하는 <strong>법인카드 번호</strong>를 입력해주세요.
              <br />
              처음 한 번만 입력하며, 바꿀 때는 관리자에게 요청해주세요.
            </p>
          )}
          <div className="sl-field">
            <label>카드번호 *</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1234-5678-9012-3456"
              value={value}
              onChange={(e) => setValue(formatCard(e.target.value))}
              autoFocus
              required
            />
          </div>
          {error && <p className="sl-field-error">⚠ {error}</p>}
          <div className="sl-modal-btns">
            {onClose && (
              <button type="button" className="sl-btn-outline" onClick={onClose}>
                취소
              </button>
            )}
            <button type="submit" className="sl-btn-primary" disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
