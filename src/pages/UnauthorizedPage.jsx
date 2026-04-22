import { useNavigate } from 'react-router-dom';

function UnauthorizedPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    // 역할에 맞는 페이지로 돌려보내기
    const roles = sessionStorage.getItem('roles');
    if (!roles) { navigate('/'); return; }

    if (roles.includes('ADMIN'))      navigate('/admin');
    else if (roles.includes('SALES')) navigate('/sales');
    else if (roles.includes('GUIDE')) navigate('/guide');
    else if (roles.includes('DEV'))   navigate('/dev');
    else navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f9fa',
      gap: '16px'
    }}>
      <div style={{ fontSize: '64px' }}>🚫</div>
      <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a' }}>
        접근 권한이 없습니다
      </h1>
      <p style={{ fontSize: '14px', color: '#888' }}>
        이 페이지에 접근할 수 있는 권한이 없어요.
      </p>
      <button
        onClick={handleBack}
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        내 페이지로 돌아가기
      </button>
    </div>
  );
}

export default UnauthorizedPage;
