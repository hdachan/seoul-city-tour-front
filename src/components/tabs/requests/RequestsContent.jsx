import { useEffect, useState, useCallback } from "react";
import { requestsApi as api } from "../../../api/requests";
import { STATUS, fmtDateTime, ROLE_LABEL } from "./requestShared";
import "./requests.css";

const FILTERS = [
  { id: "ALL", label: "전체" },
  { id: "SENT", label: "안 읽음" },
  { id: "READ", label: "확인" },
  { id: "DONE", label: "완료" },
];

// ✉️ 요청사항 (관리자) - 영업·가이드에게 보내고, 확인 · 완료 상태를 봄
export default function RequestsContent() {
  const [targets, setTargets] = useState([]);
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [content, setContent] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);

  const loadList = useCallback(() => {
    api
      .getAll()
      .then((r) => setList(r.data))
      .catch(() => setError("목록을 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    api
      .getTargets()
      .then((r) => setTargets(r.data))
      .catch(() => setError("받는 사람 목록을 불러오지 못했습니다."));
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const toggle = (username) =>
    setSelected((s) => (s.includes(username) ? s.filter((u) => u !== username) : [...s, username]));

  // 역할별로 묶어서 보여줌 (영업 → 가이드 → 그 외)
  const groups = Object.entries(
    targets.reduce((g, t) => {
      const key = ROLE_LABEL[t.role] || "기타";
      (g[key] = g[key] || []).push(t);
      return g;
    }, {}),
  ).sort(([a], [b]) => ["영업", "가이드", "기타"].indexOf(a) - ["영업", "가이드", "기타"].indexOf(b));

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    if (selected.length === 0) return setError("받는 사람을 선택해주세요.");
    if (!content.trim()) return setError("내용을 입력해주세요.");
    setSending(true);
    try {
      const r = await api.send(selected, content.trim());
      setSuccess(r.data.message || "보냈습니다.");
      setContent("");
      setSelected([]);
      loadList();
    } catch (err) {
      setError(err.response?.data?.error || "보내기 실패");
    }
    setSending(false);
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`${r.toName}에게 보낸 요청을 삭제할까요?\n받는 사람 화면에서도 사라집니다.`)) return;
    try {
      await api.remove(r.id);
      loadList();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  const counts = list.reduce((c, r) => ({ ...c, [r.status]: (c[r.status] || 0) + 1 }), {});
  const shown = filter === "ALL" ? list : list.filter((r) => r.status === filter);

  return (
    <div className="rq-page">
      {/* 보내기 */}
      <form className="rq-card" onSubmit={handleSend}>
        <div className="rq-card-title">✉️ 요청 보내기</div>
        <div className="rq-label">
          받는 사람 <span className="rq-muted">({selected.length}명 선택)</span>
        </div>
        {targets.length === 0 && <div className="rq-muted">받을 수 있는 사람이 없습니다.</div>}
        {groups.map(([group, people]) => (
          <div key={group} className="rq-group">
            <span className="rq-group-name">{group}</span>
            <div className="rq-chips">
              {people.map((p) => (
                <button
                  key={p.username}
                  type="button"
                  className={`rq-chip${selected.includes(p.username) ? " is-on" : ""}`}
                  onClick={() => toggle(p.username)}
                >
                  {selected.includes(p.username) ? "✓ " : ""}
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="rq-label">내용</div>
        <textarea
          className="rq-textarea"
          rows={3}
          maxLength={1000}
          placeholder="예) 10/27 오후 미터기가 오전보다 작아요. 수정해주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {error && <p className="rq-error">⚠ {error}</p>}
        {success && <p className="rq-success">✓ {success}</p>}
        <div className="rq-actions">
          <button type="submit" className="rq-btn-primary" disabled={sending}>
            {sending ? "보내는 중..." : "보내기"}
          </button>
        </div>
      </form>

      {/* 보낸 목록 */}
      <div className="rq-filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`rq-filter${filter === f.id ? " is-active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="rq-filter-count">{f.id === "ALL" ? list.length : counts[f.id] || 0}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rq-empty">보낸 요청이 없습니다.</div>
      ) : (
        <div className="rq-list">
          {shown.map((r) => (
            <div key={r.id} className="rq-item">
              <div className="rq-item-head">
                <span className={`rq-badge ${STATUS[r.status]?.className || ""}`}>
                  {STATUS[r.status]?.label || r.status}
                </span>
                <strong className="rq-item-to">{r.toName}</strong>
                <span className="rq-muted rq-item-time">{fmtDateTime(r.createdAt)} 보냄</span>
                <button className="rq-btn-delete" onClick={() => handleDelete(r)} title="삭제">
                  삭제
                </button>
              </div>
              <div className="rq-item-content">{r.content}</div>
              {(r.readAt || r.doneAt) && (
                <div className="rq-item-steps">
                  {r.readAt && <span>확인 {fmtDateTime(r.readAt)}</span>}
                  {r.doneAt && <span className="rq-text-green">완료 {fmtDateTime(r.doneAt)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
