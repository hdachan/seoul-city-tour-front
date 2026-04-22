import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import "./LoginPage.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(username, password);
      const roles = data.roles;
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("password", password);
      sessionStorage.setItem("roles", roles);

      navigate("/dashboard");

      // if (roles.includes('ADMIN'))      navigate('/admin');
      // else if (roles.includes('SALES')) navigate('/sales');
      // else if (roles.includes('GUIDE')) navigate('/guide');
      // else if (roles.includes('DEV'))   navigate('/dev');
      // else setError('알 수 없는 권한입니다.');
    } catch (err) {
      if (err.response?.status === 401)
        setError("아이디 또는 비밀번호가 틀렸습니다.");
      else setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-box">
        {/* 로고 */}
        <div className="login-logo">
          <span className="logo-icon">🗺</span>
          <div>
            <p className="logo-company">Seoul City Tour</p>
            <p className="logo-sub">관리 시스템</p>
          </div>
        </div>

        <div className="divider" />

        {/* 폼 */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="field">
            <label>아이디</label>
            <input
              type="text"
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-msg">⚠ {error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
