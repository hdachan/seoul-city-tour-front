import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { requestsApi as api } from "../../../api/requests";
import { fmtDateTime } from "./requestShared";
import "./requests.css";

const REFRESH_MS = 5 * 60 * 1000;

// ✉️ 받은 요청사항 (영업·가이드)
//   - 안 읽은 요청이 있으면 팝업 → "확인"을 눌러야 닫힘
//   - 확인했지만 아직 안 고친 요청은 머리글 "✉️ 요청 N" 버튼으로 다시 보고 "수정 완료"
//   - 접속할 때 · 창으로 돌아올 때 · 5분마다 새로 받아옴
export default function RequestNotice() {
  const [mine, setMine] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getMine()
      .then((r) => setMine(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onFocus = () => document.visibilityState === "visible" && load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  const unread = mine.filter((r) => r.status === "SENT");
  const pending = mine.filter((r) => r.status !== "DONE");

  const confirmAll = async () => {
    setBusy(true);
    try {
      await Promise.all(unread.map((r) => api.markRead(r.id)));
    } catch {}
    setBusy(false);
    load();
  };

  const markDone = async (r) => {
    if (!window.confirm("수정을 마쳤나요? 관리자에게 완료로 표시됩니다.")) return;
    setBusy(true);
    try {
      await api.markDone(r.id);
    } catch {}
    setBusy(false);
    load();
  };

  const Item = ({ r }) => (
    <div className="rq-notice-item">
      <div className="rq-notice-meta">
        <span>{r.fromName}</span>
        <span className="rq-muted">{fmtDateTime(r.createdAt)}</span>
      </div>
      <div className="rq-item-content">{r.content}</div>
      <div className="rq-actions">
        <button className="rq-btn-done" onClick={() => markDone(r)} disabled={busy}>
          ✓ 수정 완료
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 머리글 버튼: 아직 완료 안 된 요청이 있을 때만 */}
      {pending.length > 0 && (
        <button className="rq-header-btn" onClick={() => setPanelOpen(true)}>
          ✉️ 요청 <span className="rq-header-count">{pending.length}</span>
        </button>
      )}

      {/* 안 읽은 요청 팝업 (확인해야 닫힘)
          머리글 안에 그리면 머리글 층(z-index)에 갇혀 다른 입력창 뒤로 가려지므로 body 에 그림 */}
      {unread.length > 0 && createPortal(
        <div className="rq-modal-bg">
          <div className="rq-modal">
            <div className="rq-modal-title">✉️ 요청사항이 왔어요 ({unread.length})</div>
            <div className="rq-notice-list">
              {unread.map((r) => (
                <Item key={r.id} r={r} />
              ))}
            </div>
            <p className="rq-muted rq-notice-help">
              확인 후 고치고 나면 위쪽 <strong>✉️ 요청</strong> 버튼에서 "수정 완료"를 눌러주세요.
            </p>
            <div className="rq-actions">
              <button className="rq-btn-primary is-wide" onClick={confirmAll} disabled={busy}>
                확인
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* 확인한 요청 목록 (닫을 수 있음) */}
      {panelOpen && unread.length === 0 && createPortal(
        <div className="rq-modal-bg" onClick={() => setPanelOpen(false)}>
          <div className="rq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rq-modal-head">
              <div className="rq-modal-title">✉️ 받은 요청 ({pending.length})</div>
              <button className="rq-modal-close" onClick={() => setPanelOpen(false)}>
                ✕
              </button>
            </div>
            {pending.length === 0 ? (
              <div className="rq-empty">남은 요청이 없습니다. 👍</div>
            ) : (
              <div className="rq-notice-list">
                {pending.map((r) => (
                  <Item key={r.id} r={r} />
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
