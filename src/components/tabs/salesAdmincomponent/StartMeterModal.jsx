import { useState } from "react";
import { fmt } from "./salesShared";
import "./sales.css";

// 🚗 시작 미터기 입력창 (영업 정산 첫 진입 · 영업 정산관리 수정 공용)
//   onSave(숫자)  : 저장 (실패하면 throw → 서버 안내 문구 표시)
//   onClose      : 없으면 닫기/취소 버튼 없음 (입력해야만 들어갈 수 있음)
export default function StartMeterModal({ name, initial, onSave, onClose }) {
  const [value, setValue] = useState(initial ? String(initial) : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isFirst = !onClose;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = parseInt(value, 10);
    if (!n || n <= 0) {
      setError("미터기 숫자를 입력해주세요.");
      return;
    }
    // 처음 입력은 되돌릴 수 없으니 한 번 더 확인
    if (isFirst && !window.confirm(`시작 미터기를 ${fmt(n)}km 로 저장할까요?`)) return;
    setError("");
    setSaving(true);
    try {
      await onSave(n);
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
            {isFirst ? "🚗 처음 시작하시네요!" : `시작 미터기 수정${name ? ` · ${name}` : ""}`}
          </h3>
          {onClose && (
            <button className="sl-modal-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="sl-modal-form">
          {isFirst ? (
            <p className="sl-start-desc">
              지금 차량 계기판의 <strong>미터기 숫자</strong>를 입력해주세요.
              <br />
              이 숫자부터 운행거리가 계산됩니다. (처음 한 번만 입력)
            </p>
          ) : (
            <p className="sl-start-desc">
              이전 운행 기록이 없을 때 운행거리 계산의 기준이 되는 값입니다.
              <br />
              첫 운행 기록의 미터기보다 클 수 없습니다.
            </p>
          )}
          <div className="sl-field">
            <label>시작 미터기 (km) *</label>
            <div className="sl-unit-input">
              <input
                type="number"
                placeholder="계량기 숫자"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                required
              />
              <span className="sl-unit">km</span>
            </div>
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
