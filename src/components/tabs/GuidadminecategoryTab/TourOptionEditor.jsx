// 투어 카테고리 표: 투어 밑의 옵션 추가 / 삭제 (금액은 수입 입력할 때 직접 적음)
import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminTourOptionsById,
  addAdminTourOption,
  deleteAdminTourOption,
} from "../../../api/auth";

export default function TourOptionEditor({ tour, setSuccess, setError }) {
  const [options, setOptions] = useState([]);
  const [name, setName] = useState("");

  const load = useCallback(
    () =>
      fetchAdminTourOptionsById(tour.id)
        .then((r) => setOptions(r.data))
        .catch(() => setOptions([])),
    [tour.id],
  );
  useEffect(() => {
    load();
  }, [load]);

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addAdminTourOption(tour.id, name.trim())
      .then(() => {
        setName("");
        setSuccess("추가되었습니다.");
        load();
      })
      .catch((err) => setError(err.response?.data?.error || "추가 실패"));
  };

  const remove = (o) => {
    if (!window.confirm(`옵션 "${o.name}"을 삭제할까요? (이미 저장된 수입의 기록은 남아요)`)) return;
    deleteAdminTourOption(o.id)
      .then(() => {
        setSuccess("삭제되었습니다.");
        load();
      })
      .catch((err) => setError(err.response?.data?.error || "삭제 실패"));
  };

  return (
    <div style={{ marginTop: "6px", fontWeight: 400 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: options.length ? "6px" : 0 }}>
        {options.map((o) => (
          <span
            key={o.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              fontSize: "12px",
              background: "#eff6ff",
              color: "#1557b0",
              borderRadius: "10px",
            }}
          >
            {o.name}
            <button
              type="button"
              aria-label={`옵션 ${o.name} 삭제`}
              onClick={() => remove(o)}
              style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", padding: 0, fontSize: "11px" }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={add} style={{ display: "flex", gap: "6px", maxWidth: "320px" }}>
        <input
          type="text"
          aria-label={`${tour.name} 옵션 이름`}
          placeholder="옵션 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "5px 8px",
            border: "1px solid #d8dce3",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
        <button type="submit" className="btn-outline" style={{ padding: "4px 10px", fontSize: "12px" }}>
          ＋ 옵션
        </button>
      </form>
    </div>
  );
}
