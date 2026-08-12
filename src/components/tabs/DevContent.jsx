import { useEffect, useState } from "react";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});

const fetchRoles = () => axios.get(`${BASE_URL}/dev/roles`, authHeader());
const fetchTabs = () => axios.get(`${BASE_URL}/dev/tabs`, authHeader());
const addRole = (data) =>
  axios.post(`${BASE_URL}/dev/roles`, data, authHeader());
const updateRole = (id, data) =>
  axios.put(`${BASE_URL}/dev/roles/${id}`, data, authHeader());
const deleteRole = (id) =>
  axios.delete(`${BASE_URL}/dev/roles/${id}`, authHeader());

export default function DevContent() {
  const [roles, setRoles] = useState([]);
  const [allTabs, setAllTabs] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ displayName: "", allowedTabs: [] });
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    allowedTabs: [],
  });

  const load = async () => {
    try {
      const [r, t] = await Promise.all([fetchRoles(), fetchTabs()]);
      setRoles(r.data);
      setAllTabs(t.data);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleTab = (tabId, current, setter) => {
    setter((prev) => {
      const tabs = prev.allowedTabs;
      return {
        ...prev,
        allowedTabs: tabs.includes(tabId)
          ? tabs.filter((t) => t !== tabId)
          : [...tabs, tabId],
      };
    });
  };

  // ── 추가 ──
  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!addForm.displayName.trim()) {
      setError("역할 이름을 입력해주세요.");
      return;
    }
    if (addForm.allowedTabs.length === 0) {
      setError("탭을 하나 이상 선택해주세요.");
      return;
    }
    try {
      await addRole(addForm);
      setSuccess("역할이 추가되었습니다. 해당 계정은 재로그인 후 적용됩니다.");
      setShowAdd(false);
      setAddForm({ displayName: "", allowedTabs: [] });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "추가 실패");
    }
  };

  // ── 수정 열기 ──
  const openEdit = (role) => {
    setEditTarget(role);
    setEditForm({
      displayName: role.displayName,
      allowedTabs: [...role.allowedTabs],
    });
    setError("");
    setShowEdit(true);
  };

  // ── 수정 저장 ──
  const handleEdit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await updateRole(editTarget.id, editForm);
      setSuccess(
        "수정되었습니다. 해당 계정은 재로그인 후 변경사항이 적용됩니다.",
      );
      setShowEdit(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "수정 실패");
    }
  };

  // ── 삭제 ──
  const handleDelete = async (role) => {
    if (role.isSystem) {
      setError("기본 역할은 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm(`'${role.displayName}' 역할을 삭제할까요?`)) return;
    try {
      await deleteRole(role.id);
      setSuccess("삭제되었습니다.");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  const TabCheckboxes = ({ form, setter }) => (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
    >
      {allTabs.map((tab) => {
        const checked = form.allowedTabs.includes(tab.id);
        return (
          <label
            key={tab.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              border: `1.5px solid ${checked ? "#1557b0" : "#e8eaed"}`,
              background: checked ? "#e8f0fe" : "#fff",
              transition: "all 0.15s",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleTab(tab.id, form.allowedTabs, setter)}
              style={{
                width: "15px",
                height: "15px",
                accentColor: "#1557b0",
                cursor: "pointer",
              }}
            />
            <span
              style={{
                fontSize: "13px",
                fontWeight: checked ? 600 : 400,
                color: checked ? "#1557b0" : "#555",
              }}
            >
              {tab.label}
            </span>
          </label>
        );
      })}
    </div>
  );

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  return (
    <div style={{ maxWidth: "860px" }}>
      {error && (
        <div className="alert alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" onClick={() => setSuccess("")}>
          ✅ {success}
        </div>
      )}

      {/* 안내 배너 */}
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "16px",
          fontSize: "13px",
          color: "#92400e",
        }}
      >
        💡 탭 권한을 변경한 후 해당 계정이 <strong>재로그인</strong>해야
        적용됩니다.
      </div>

      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a2e" }}>
            ⚙️ 역할 및 탭 권한 관리
          </h2>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
            역할마다 접근할 수 있는 탭을 설정합니다.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setError("");
            setAddForm({ displayName: "", allowedTabs: [] });
            setShowAdd(true);
          }}
        >
          + 역할 추가
        </button>
      </div>

      {/* 기본 역할 */}
      <div style={sectionLabelStyle}>기본 역할 (시스템)</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "24px",
        }}
      >
        {systemRoles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            allTabs={allTabs}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* 커스텀 역할 */}
      <div style={sectionLabelStyle}>커스텀 역할</div>
      {customRoles.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            border: "1.5px dashed #e0e0e0",
            padding: "2.5rem",
            textAlign: "center",
            color: "#bbb",
            fontSize: "13px",
          }}
        >
          커스텀 역할이 없습니다. "+ 역할 추가"로 생성해보세요.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {customRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              allTabs={allTabs}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 추가 모달 */}
      {showAdd && (
        <div className="modal-bg">
          <div className="modal" style={{ width: "520px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>
                역할 추가
              </h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="modal-form">
              <div className="field">
                <label>역할 이름 *</label>
                <input
                  type="text"
                  placeholder="예: 회계, 운전기사, 매니저"
                  value={addForm.displayName}
                  onChange={(e) =>
                    setAddForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="field">
                <label>허용할 탭 선택 *</label>
                <TabCheckboxes form={addForm} setter={setAddForm} />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowAdd(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  역할 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEdit && editTarget && (
        <div className="modal-bg">
          <div className="modal" style={{ width: "520px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>
                역할 수정 — {editTarget.displayName}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowEdit(false)}
              >
                ✕
              </button>
            </div>
            {editTarget.isSystem && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "14px",
                  fontSize: "12px",
                  color: "#92400e",
                }}
              >
                ⚠ 기본 역할은 탭 권한만 수정 가능합니다.
              </div>
            )}
            <form onSubmit={handleEdit} className="modal-form">
              {!editTarget.isSystem && (
                <div className="field">
                  <label>역할 이름</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
              <div className="field">
                <label>허용할 탭</label>
                <TabCheckboxes form={editForm} setter={setEditForm} />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowEdit(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleCard({ role, allTabs, onEdit, onDelete }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        border: "1px solid #e8eaed",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a2e" }}>
            {role.displayName}
          </span>
          {role.isSystem && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                background: "#f0f2f5",
                color: "#888",
                borderRadius: "99px",
                fontWeight: 600,
              }}
            >
              시스템
            </span>
          )}
          <span
            style={{ fontSize: "11px", color: "#ccc", fontFamily: "monospace" }}
          >
            {role.roleKey}
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => onEdit(role)} style={editBtnStyle}>
            수정
          </button>
          {!role.isSystem && (
            <button onClick={() => onDelete(role)} className="delete-btn">
              삭제
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {role.allowedTabs.length === 0 ? (
          <span style={{ fontSize: "12px", color: "#ccc" }}>
            허용된 탭 없음
          </span>
        ) : (
          role.allowedTabs.map((tabId) => {
            const tab = allTabs.find((t) => t.id === tabId);
            return tab ? (
              <span
                key={tabId}
                style={{
                  fontSize: "11px",
                  padding: "3px 10px",
                  background: "#e8f0fe",
                  color: "#1557b0",
                  borderRadius: "99px",
                  fontWeight: 500,
                }}
              >
                {tab.label}
              </span>
            ) : null;
          })
        )}
      </div>
    </div>
  );
}

const sectionLabelStyle = {
  marginBottom: "8px",
  fontSize: "11px",
  fontWeight: 700,
  color: "#aaa",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
};
const editBtnStyle = {
  padding: "5px 12px",
  background: "#f0f4ff",
  color: "#1557b0",
  border: "1px solid #c7d7f8",
  borderRadius: "6px",
  fontSize: "12px",
  cursor: "pointer",
  fontWeight: 500,
};
