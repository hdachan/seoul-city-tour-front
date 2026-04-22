import { useEffect, useState } from 'react';
import { fetchAdminUsers, createUser, deleteUser } from '../../api/auth';

export default function AdminContent() {
  const [users, setUsers]     = useState([]);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ username: '', password: '', name: '', role: 'ROLE_SALES' });

  const loadUsers = async () => {
    try { const res = await fetchAdminUsers(); setUsers(res.data); }
    catch { setError('계정 목록을 불러오지 못했습니다.'); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.username || !form.password || !form.name) { setError('모든 항목을 입력해주세요.'); return; }
    setLoading(true);
    try {
      await createUser(form.username, form.password, form.role, form.name);
      setSuccess(`✅ ${form.name}(${form.username}) 계정이 생성되었습니다.`);
      setForm({ username: '', password: '', name: '', role: 'ROLE_SALES' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || '계정 생성에 실패했습니다.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, username, name) => {
    if (!window.confirm(`${name}(${username}) 계정을 삭제할까요?`)) return;
    setError(''); setSuccess('');
    try {
      await deleteUser(id);
      setSuccess(`✅ ${name} 계정이 삭제되었습니다.`);
      loadUsers();
    } catch (err) { setError(err.response?.data?.error || '삭제에 실패했습니다.'); }
  };

  const roleLabel    = (role) => role === 'ROLE_SALES' ? '영업' : '가이드';
  const roleBadgeCls = (role) => role === 'ROLE_SALES' ? 'badge-sales' : 'badge-guide';

  return (
    <div>
      {error   && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* 계정 목록 */}
        <div className="card">
          <h3 className="card-title">계정 목록</h3>
          <p className="card-desc">영업 · 가이드 계정만 관리 가능합니다</p>
          {users.length === 0 ? <p className="empty">등록된 계정이 없습니다.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr>
                  {['이름', '아이디', '역할', '삭제'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 0', color: '#888', fontSize: '12px', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ padding: '12px 0', borderBottom: '1px solid #f9f9f9' }}>{u.name || '-'}</td>
                    <td style={{ padding: '12px 0', borderBottom: '1px solid #f9f9f9', color: '#888' }}>{u.username}</td>
                    <td style={{ padding: '12px 0', borderBottom: '1px solid #f9f9f9' }}>
                      <span className={`badge ${roleBadgeCls(u.role)}`}>{roleLabel(u.role)}</span>
                    </td>
                    <td style={{ padding: '12px 0', borderBottom: '1px solid #f9f9f9' }}>
                      <button className="delete-btn" onClick={() => handleDelete(u.id, u.username, u.name)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 계정 생성 */}
        <div className="card">
          <h3 className="card-title">계정 생성</h3>
          <p className="card-desc">영업 또는 가이드 계정을 생성합니다</p>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="field"><label>이름</label>
              <input type="text" placeholder="이름 입력" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="field"><label>아이디</label>
              <input type="text" placeholder="아이디 입력" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div className="field"><label>비밀번호</label>
              <input type="password" placeholder="비밀번호 입력" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div className="field"><label>역할</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="ROLE_SALES">영업</option>
                <option value="ROLE_GUIDE">가이드</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '11px' }} disabled={loading}>
              {loading ? '생성 중...' : '계정 생성'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
