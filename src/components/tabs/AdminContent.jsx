import { useEffect, useState } from 'react';
import { fetchAdminUsers, createUser, deleteUser } from '../../api/auth';
import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';
const authHeader = () => ({ headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` } });
const updateUser = (id, data) => axios.put(`${BASE_URL}/admin/users/${id}`, data, authHeader());

const ROLES = [
  { value: 'ROLE_SALES', label: '영업',   color: '#059669', bg: '#d1fae5' },
  { value: 'ROLE_GUIDE', label: '가이드', color: '#1557b0', bg: '#dbeafe' },
];

const ROLE_MAP = {
  ROLE_SALES: { label: '영업',   color: '#059669', bg: '#d1fae5' },
  ROLE_GUIDE: { label: '가이드', color: '#1557b0', bg: '#dbeafe' },
  ROLE_ADMIN: { label: '관리자', color: '#7c3aed', bg: '#ede9fe' },
  ROLE_DEV:   { label: '개발자', color: '#92400e', bg: '#fef3c7' },
};

export default function AdminContent() {
  const [users, setUsers]           = useState([]);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // 추가 모달
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState({ username: '', password: '', role: 'ROLE_SALES', name: '' });

  // 수정 모달
  const [showEdit, setShowEdit]     = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm]     = useState({ name: '', role: '', newPassword: '' });

  const load = async () => {
    try { const r = await fetchAdminUsers(); setUsers(r.data); }
    catch { setError('불러오기 실패'); }
  };

  useEffect(() => { load(); }, []);

  // ── 계정 추가 ──
  const handleAdd = async (e) => {
    e.preventDefault(); setError('');
    if (!addForm.username || !addForm.password) { setError('아이디와 비밀번호를 입력해주세요.'); return; }
    try {
      await createUser(addForm.username, addForm.password, addForm.role, addForm.name);
      setSuccess('계정이 생성되었습니다.');
      setShowAdd(false);
      setAddForm({ username: '', password: '', role: 'ROLE_SALES', name: '' });
      load();
    } catch (err) { setError(err.response?.data?.error || '생성 실패'); }
  };

  // ── 수정 모달 열기 ──
  const openEdit = (user) => {
    setEditTarget(user);
    setEditForm({ name: user.name || '', role: user.role, newPassword: '' });
    setError('');
    setShowEdit(true);
  };

  // ── 계정 수정 ──
  const handleEdit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await updateUser(editTarget.id, editForm);
      setSuccess('수정되었습니다.');
      setShowEdit(false);
      load();
    } catch (err) { setError(err.response?.data?.error || '수정 실패'); }
  };

  // ── 계정 삭제 ──
  const handleDelete = async (user) => {
    if (!window.confirm(`'${user.name || user.username}' 계정을 삭제할까요?\n삭제 후 로그인이 불가합니다.`)) return;
    try {
      await deleteUser(user.id);
      setSuccess('삭제되었습니다.');
      load();
    } catch (err) { setError(err.response?.data?.error || '삭제 실패'); }
  };

  const salesUsers = users.filter(u => u.role === 'ROLE_SALES');
  const guideUsers = users.filter(u => u.role === 'ROLE_GUIDE');

  return (
    <div style={{ maxWidth: '800px' }}>
      {error   && <div className="alert alert-error"   onClick={() => setError('')}>⚠ {error}</div>}
      {success && <div className="alert alert-success" onClick={() => setSuccess('')}>✅ {success}</div>}

      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a2e' }}>계정 관리</h2>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            영업 {salesUsers.length}명 · 가이드 {guideUsers.length}명
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setError(''); setShowAdd(true); }}>
          + 계정 추가
        </button>
      </div>

      {/* 영업 섹션 */}
      <UserSection
        title="💼 영업"
        users={salesUsers}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* 가이드 섹션 */}
      <UserSection
        title="📝 가이드"
        users={guideUsers}
        onEdit={openEdit}
        onDelete={handleDelete}
        style={{ marginTop: '16px' }}
      />

      {/* 계정 추가 모달 */}
      {showAdd && (
        <div className="modal-bg">  {/* onClick 제거 - 바깥 클릭으로 안 닫힘 */}
          <div className="modal" style={{ width: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>계정 추가</h3>
              <button onClick={() => setShowAdd(false)} style={closeBtnStyle}>✕</button>
            </div>
            <form onSubmit={handleAdd} className="modal-form">
              <div className="field">
                <label>역할 *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setAddForm({...addForm, role: r.value})}
                      style={{ flex: 1, padding: '10px', border: '1.5px solid', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: addForm.role === r.value ? 700 : 400,
                        background: addForm.role === r.value ? r.bg : '#fff',
                        color:      addForm.role === r.value ? r.color : '#888',
                        borderColor: addForm.role === r.value ? r.color : '#e0e0e0' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>이름</label>
                <input type="text" placeholder="홍길동" value={addForm.name}
                  onChange={e => setAddForm({...addForm, name: e.target.value})} />
              </div>
              <div className="field">
                <label>아이디 *</label>
                <input type="text" placeholder="영문+숫자 4~20자" value={addForm.username}
                  onChange={e => setAddForm({...addForm, username: e.target.value})} required />
              </div>
              <div className="field">
                <label>비밀번호 *</label>
                <input type="password" placeholder="초기 비밀번호" value={addForm.password}
                  onChange={e => setAddForm({...addForm, password: e.target.value})} required />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setShowAdd(false)}>취소</button>
                <button type="submit" className="btn-primary">계정 생성</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 계정 수정 모달 */}
      {showEdit && editTarget && (
        <div className="modal-bg">  {/* onClick 제거 */}
          <div className="modal" style={{ width: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>계정 수정</h3>
              <button onClick={() => setShowEdit(false)} style={closeBtnStyle}>✕</button>
            </div>
            {/* 계정 정보 표시 */}
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#555' }}>
              아이디: <strong style={{ color: '#1a1a2e' }}>{editTarget.username}</strong>
            </div>
            <form onSubmit={handleEdit} className="modal-form">
              <div className="field">
                <label>이름</label>
                <input type="text" placeholder="이름 입력" value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="field">
                <label>역할</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setEditForm({...editForm, role: r.value})}
                      style={{ flex: 1, padding: '10px', border: '1.5px solid', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: editForm.role === r.value ? 700 : 400,
                        background: editForm.role === r.value ? r.bg : '#fff',
                        color:      editForm.role === r.value ? r.color : '#888',
                        borderColor: editForm.role === r.value ? r.color : '#e0e0e0' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>새 비밀번호 <span style={{ color: '#aaa', fontWeight: 400 }}>(변경 시에만 입력)</span></label>
                <input type="password" placeholder="변경할 비밀번호 입력" value={editForm.newPassword}
                  onChange={e => setEditForm({...editForm, newPassword: e.target.value})} />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setShowEdit(false)}>취소</button>
                <button type="submit" className="btn-primary">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserSection({ title, users, onEdit, onDelete, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8eaed', ...style }}>
      {/* 섹션 헤더 */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{title}</span>
        <span style={{ fontSize: '12px', color: '#888' }}>{users.length}명</span>
      </div>

      {users.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>
          등록된 계정이 없습니다.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thStyle}>이름</th>
              <th style={thStyle}>아이디</th>
              <th style={thStyle}>역할</th>
              <th style={{ ...thStyle, width: '120px' }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role = ROLE_MAP[u.role] || { label: u.role, color: '#888', bg: '#f0f0f0' };
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #f0f2f5' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: role.bg, color: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {(u.name || u.username).charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name || '-'}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: '#888', fontFamily: 'monospace', fontSize: '12px' }}>{u.username}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px', background: role.bg, color: role.color }}>
                      {role.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => onEdit(u)} style={editBtnStyle}>수정</button>
                      <button onClick={() => onDelete(u)} className="delete-btn">삭제</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle     = { padding: '9px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px' };
const tdStyle     = { padding: '12px 16px' };
const editBtnStyle = { padding: '5px 12px', background: '#f0f4ff', color: '#1557b0', border: '1px solid #c7d7f8', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 500 };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '16px', color: '#888', cursor: 'pointer', padding: '4px', lineHeight: 1, borderRadius: '4px' };
