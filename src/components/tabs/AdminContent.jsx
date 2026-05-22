import { useEffect, useState } from "react";
import { fetchAdminUsers, createUser, deleteUser } from "../../api/auth";
import { getRoleFromToken } from "../../utils/tokenUtils";
import axios from "axios";

const BASE_URL = "https://seoul3345.cafe24.com/api";
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const updateUser = (id, data) =>
  axios.put(`${BASE_URL}/admin/users/${id}`, data, authHeader());
const fetchAllRoles = () => axios.get(`${BASE_URL}/dev/roles`, authHeader());

const ROLE_COLORS = {
  ROLE_ADMIN: { label: "관리자", color: "#7c3aed", bg: "#ede9fe" },
  ROLE_DEV: { label: "개발자", color: "#92400e", bg: "#fef3c7" },
  ROLE_SALES: { label: "영업", color: "#059669", bg: "#d1fae5" },
  ROLE_GUIDE: { label: "가이드", color: "#1557b0", bg: "#dbeafe" },
};

const getRoleMeta = (roleKey, allRoles) => {
  if (ROLE_COLORS[roleKey]) return ROLE_COLORS[roleKey];
  const found = allRoles.find((r) => r.roleKey === roleKey);
  if (found)
    return { label: found.displayName, color: "#6b7280", bg: "#f3f4f6" };
  return { label: roleKey.replace("ROLE_", ""), color: "#aaa", bg: "#f0f0f0" };
};

// ADMIN, DEV 만 실제 데이터 접근 가능
const ALLOWED_ROLES = ["ROLE_ADMIN", "ROLE_DEV"];

export default function AdminContent() {
  const currentRole = getRoleFromToken();
  const isAllowed = ALLOWED_ROLES.includes(currentRole);

  const [users, setUsers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    role: "ROLE_SALES",
    name: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    role: "",
    newPassword: "",
  });

  const load = async () => {
    if (!isAllowed) return;
    try {
      const [u, r] = await Promise.all([fetchAdminUsers(), fetchAllRoles()]);
      setUsers(u.data);
      setAllRoles(r.data);
    } catch {
      setError("불러오기 실패");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 접근 권한 없는 경우 안내 화면
  if (!isAllowed) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "48px" }}>🔒</div>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a2e" }}>
          접근 권한이 없습니다
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "#888",
            textAlign: "center",
            lineHeight: "1.6",
          }}
        >
          계정 관리는 <strong>관리자(ADMIN)</strong>와{" "}
          <strong>개발자(DEV)</strong>만 접근할 수 있습니다.
          <br />
          해당 기능이 필요하시면 관리자에게 문의해주세요.
        </div>
      </div>
    );
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!addForm.username || !addForm.password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    try {
      await createUser(
        addForm.username,
        addForm.password,
        addForm.role,
        addForm.name,
      );
      setSuccess("계정이 생성되었습니다.");
      setShowAdd(false);
      setAddForm({ username: "", password: "", role: "ROLE_SALES", name: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "생성 실패");
    }
  };

  const openEdit = (user) => {
    setEditTarget(user);
    setEditForm({ name: user.name || "", role: user.role, newPassword: "" });
    setError("");
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await updateUser(editTarget.id, editForm);
      setSuccess("수정되었습니다.");
      setShowEdit(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "수정 실패");
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`'${user.name || user.username}' 계정을 삭제할까요?`))
      return;
    try {
      await deleteUser(user.id);
      setSuccess("삭제되었습니다.");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // 역할별로 그룹핑
  const grouped = {};
  users.forEach((u) => {
    const meta = getRoleMeta(u.role, allRoles);
    if (!grouped[u.role]) grouped[u.role] = { meta, users: [] };
    grouped[u.role].users.push(u);
  });

  const selectableRoles = allRoles.filter(
    (r) =>
      r.roleKey !== "ROLE_ADMIN" &&
      r.roleKey !== "ROLE_DEV" &&
      r.active !== false,
  );

  return (
    <div style={{ maxWidth: "800px" }}>
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
            계정 관리
          </h2>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            총 {users.length}명의 계정
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setError("");
            setAddForm({
              username: "",
              password: "",
              role: selectableRoles[0]?.roleKey || "ROLE_SALES",
              name: "",
            });
            setShowAdd(true);
          }}
        >
          + 계정 추가
        </button>
      </div>

      {/* 역할별 섹션 */}
      {Object.entries(grouped).map(([roleKey, { meta, users: roleUsers }]) => (
        <div
          key={roleKey}
          style={{
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #e8eaed",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              padding: "11px 16px",
              borderBottom: "1px solid #f0f2f5",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "99px",
                background: meta.bg,
                color: meta.color,
              }}
            >
              {meta.label}
            </span>
            <span style={{ fontSize: "12px", color: "#aaa" }}>
              {roleUsers.length}명
            </span>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "40%" }} /> {/* 이름 */}
              <col style={{ width: "40%" }} /> {/* 아이디 */}
              <col style={{ width: "20%" }} /> {/* 버튼 */}
            </colgroup>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={thStyle}>이름</th>
                <th style={thStyle}>아이디</th>
                <th style={{ ...thStyle, width: "130px" }}></th>
              </tr>
            </thead>
            <tbody>
              {roleUsers.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #f0f2f5" }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 500, color: "#1a1a2e" }}>
                      {u.name || "-"}
                    </span>
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: "#888",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {u.username}
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button onClick={() => openEdit(u)} style={editBtnStyle}>
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="delete-btn"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {users.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "#bbb",
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #e8eaed",
          }}
        >
          등록된 계정이 없습니다.
        </div>
      )}

      {/* 추가 모달 */}
      {showAdd && (
        <div className="modal-bg">
          <div className="modal" style={{ width: "420px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>
                계정 추가
              </h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="modal-form">
              <div className="field">
                <label>역할 *</label>
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm({ ...addForm, role: e.target.value })
                  }
                >
                  {selectableRoles.map((r) => (
                    <option key={r.roleKey} value={r.roleKey}>
                      {r.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>이름</label>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>아이디 *</label>
                <input
                  type="text"
                  placeholder="영문+숫자 4~20자"
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm({ ...addForm, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field">
                <label>비밀번호 *</label>
                <input
                  type="password"
                  placeholder="초기 비밀번호"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                  required
                />
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
                  계정 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEdit && editTarget && (
        <div className="modal-bg">
          <div className="modal" style={{ width: "420px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>
                계정 수정
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowEdit(false)}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                background: "#f8f9fb",
                borderRadius: "8px",
                padding: "9px 14px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#555",
              }}
            >
              아이디:{" "}
              <strong style={{ color: "#1a1a2e" }}>
                {editTarget.username}
              </strong>
            </div>
            <form onSubmit={handleEdit} className="modal-form">
              <div className="field">
                <label>이름</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>역할</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                >
                  {selectableRoles.map((r) => (
                    <option key={r.roleKey} value={r.roleKey}>
                      {r.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>
                  새 비밀번호{" "}
                  <span style={{ color: "#aaa", fontWeight: 400 }}>
                    (변경 시에만)
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="변경할 비밀번호"
                  value={editForm.newPassword}
                  onChange={(e) =>
                    setEditForm({ ...editForm, newPassword: e.target.value })
                  }
                />
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

const thStyle = {
  padding: "9px 16px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 600,
  color: "#999",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};
const tdStyle = { padding: "11px 16px" };
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
