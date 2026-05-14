import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

function sanitizeInput(value) {
  return value.replace(/[<>'"&]/g, '').replace(/javascript:/gi, '').trim();
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    if (!username || !password) { setError('아이디와 비밀번호를 입력해주세요.'); return; }
    if (username.length < 4)   { setError('아이디는 4자 이상이어야 합니다.'); return; }

    setLoading(true);
    try {
      const data = await login(sanitizeInput(username), password);

      // 세션 저장
      sessionStorage.setItem('token',       data.token);
      sessionStorage.setItem('username',    data.username);
      sessionStorage.setItem('name',        data.name);
      // 허용 탭 목록 저장 (동적 권한 시스템)
      sessionStorage.setItem('allowedTabs', JSON.stringify(data.allowedTabs || []));

      navigate('/dashboard');
    } catch (err) {
      if      (err.response?.status === 401) setError('아이디 또는 비밀번호가 틀렸습니다.');
      else if (err.response?.status === 429) setError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
      else                                   setError('서버에 연결할 수 없습니다.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7', fontFamily: "'Pretendard', -apple-system, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '14px', padding: '36px 32px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e8eaed' }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e' }}>서울시티투어</div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '3px' }}>관리 시스템</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={labelStyle}>아이디</label>
            <input type="text" placeholder="아이디" value={username} maxLength={20}
              onChange={e => setUsername(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={labelStyle}>비밀번호</label>
            <input type="password" placeholder="비밀번호" value={password} maxLength={50}
              onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '7px', padding: '9px 12px', fontSize: '13px', color: '#dc2626' }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            padding: '11px', background: loading ? '#93c5fd' : '#1557b0', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px', transition: 'background 0.15s'
          }}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#555' };
const inputStyle = {
  padding: '10px 12px', border: '1.5px solid #d8dce3', borderRadius: '8px',
  fontSize: '13px', outline: 'none', transition: 'border-color 0.15s',
};
