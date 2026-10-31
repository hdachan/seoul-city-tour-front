import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login } from '../api/auth';
import { saveLogin, isTokenExpired, restoreRememberedLogin } from '../utils/tokenUtils';
import './LoginPage.css';

// 프론트 입력값 정제 (XSS 1차 방어)
function sanitizeInput(value) {
  return value
    .replace(/[<>'"&]/g, '')   // HTML 특수문자 제거
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();

  // 로그인 화면을 열어둔 채 다른 탭에서 "로그인 유지"로 로그인했으면,
  // 이 탭으로 돌아왔을 때 바로 들어감
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      restoreRememberedLogin();
      if (sessionStorage.getItem('token') && !isTokenExpired()) navigate('/dashboard', { replace: true });
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [navigate]);

  // 이미 로그인 상태(로그인 유지 포함)면 로그인 화면 건너뜀
  if (sessionStorage.getItem('token') && !isTokenExpired()) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // 프론트 입력값 검증
    if (!username || !password) { setError('아이디와 비밀번호를 입력해주세요.'); return; }
    if (username.length < 2 || username.length > 20) { setError('아이디는 2~20자로 입력해주세요.'); return; }
    if (password.length < 4) { setError('비밀번호는 4자 이상이어야 합니다.'); return; }

    const cleanUsername = sanitizeInput(username);

    setLoading(true);
    try {
      const data = await login(cleanUsername, password, remember);
      // 비밀번호는 절대 저장하지 않음 - 토큰만 저장 (로그인 유지면 창을 닫아도 남김)
      // role은 tokenUtils.js에서 토큰 직접 파싱하므로 저장 불필요
      saveLogin(data, remember);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError('아이디 또는 비밀번호가 틀렸습니다.');
      else if (status === 429) setError(err.response.data?.error || '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
      else if (status === 400) setError(err.response.data?.error || '입력값을 확인해주세요.');
      else if (!err.response) setError('서버에 연결할 수 없습니다.');
      else setError(err.response.data?.error || `로그인 중 오류가 발생했습니다. (${status})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="login-logo">
          <span className="logo-icon">🗺</span>
          <div>
            <p className="logo-company">Seoul City Tour</p>
            <p className="logo-sub">관리 시스템</p>
          </div>
        </div>
        <div className="divider" />
        <form onSubmit={handleLogin} className="login-form">
          <div className="field">
            <label>아이디</label>
            <input type="text" placeholder="아이디를 입력하세요"
              value={username}
              maxLength={20}
              onChange={e => setUsername(e.target.value)}
              required />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input type="password" placeholder="비밀번호를 입력하세요"
              value={password}
              maxLength={50}
              onChange={e => setPassword(e.target.value)}
              required />
          </div>
          <label className="remember-row">
            <input type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)} />
            로그인 유지 <span className="remember-hint">(30일 · 공용 PC에서는 체크하지 마세요)</span>
          </label>
          {error && <p className="error-msg">⚠ {error}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
