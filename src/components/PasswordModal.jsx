import { useState } from "react";
import { createPortal } from "react-dom";
import { changeMyPassword } from "../api/auth";

// 🔑 내 비밀번호 변경 (누구나) - 현재 비밀번호를 확인하고 새 비밀번호로 바꿈
//   머리글 안에서 열리므로 머리글 층(z-index)에 갇히지 않게 body 에 그림
export default function PasswordModal({ onClose, onDone }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.current || !form.next) return setError("비밀번호를 입력해주세요.");
    if (form.next.length < 4) return setError("새 비밀번호는 4자 이상이어야 합니다.");
    if (form.next !== form.confirm) return setError("새 비밀번호가 서로 다릅니다.");
    setSaving(true);
    try {
      await changeMyPassword(form.current, form.next);
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "변경 실패");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-bg">
      <div className="modal" style={{ width: "380px" }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ margin: 0 }}>
            🔑 내 비밀번호 변경
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field">
            <label>현재 비밀번호 *</label>
            <input type="password" value={form.current} onChange={set("current")} autoFocus required />
          </div>
          <div className="field">
            <label>새 비밀번호 *</label>
            <input
              type="password"
              placeholder="4자 이상"
              maxLength={50}
              value={form.next}
              onChange={set("next")}
              required
            />
          </div>
          <div className="field">
            <label>새 비밀번호 확인 *</label>
            <input type="password" maxLength={50} value={form.confirm} onChange={set("confirm")} required />
          </div>
          {error && <p className="field-error">⚠ {error}</p>}
          <div className="modal-btns">
            <button type="button" className="btn-outline" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "변경 중..." : "변경"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
