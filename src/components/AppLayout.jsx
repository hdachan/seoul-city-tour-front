import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoleFromToken, isTokenExpired, clearSession } from '../utils/tokenUtils';
import AdminContent from './tabs/AdminContent';
import RecordContent from './tabs/RecordContent';
import SettlementContent from './tabs/SettlementContent';
import GinsengContent from './tabs/GinsengContent';
import GuideAdminContent from './tabs/GuideAdminContent';
import GuideFormContent from './tabs/GuideFormContent';
import { SalesContent, DevContent } from './tabs/OtherContents';
import './AppLayout.css';

const ALL_TABS = [
  { id: 'admin',       label: '👥 계정 관리',       roles: ['ROLE_ADMIN'] },
  { id: 'record',      label: '📋 운행 기록',       roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'settlement',  label: '💰 업체별 정산',     roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'ginseng',     label: '🌿 인삼 매출',       roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'guide-admin', label: '📂 가이드 정산관리', roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'guide-form',  label: '📝 가이드 정산',     roles: ['ROLE_GUIDE'] },
  { id: 'sales',       label: '💼 영업',             roles: ['ROLE_SALES'] },
  { id: 'dev',         label: '💻 개발',             roles: ['ROLE_DEV'] },
];

const ROLE_STYLE = {
  ROLE_ADMIN: { label: '관리자', cls: 'badge-admin' },
  ROLE_SALES: { label: '영업',   cls: 'badge-sales' },
  ROLE_GUIDE: { label: '가이드', cls: 'badge-guide' },
  ROLE_DEV:   { label: '개발자', cls: 'badge-dev'   },
};

function AppLayout() {
  const navigate = useNavigate();

  // ── 핵심: sessionStorage role 대신 토큰에서 직접 추출 ──
  const tokenRole = getRoleFromToken();
  const username  = sessionStorage.getItem('username') || '';
  const name      = sessionStorage.getItem('name') || username;

  const visibleTabs = ALL_TABS.filter(tab => tab.roles.includes(tokenRole));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || '');

  useEffect(() => {
    // 토큰 없거나 만료 시 로그아웃
    if (!tokenRole || isTokenExpired()) {
      clearSession();
      return;
    }
    // 탭 접근 권한 검사: 현재 탭이 role에 맞지 않으면 첫 탭으로
    const tab = ALL_TABS.find(t => t.id === activeTab);
    if (tab && !tab.roles.includes(tokenRole)) {
      setActiveTab(visibleTabs[0]?.id || '');
    }
  }, [tokenRole, activeTab]);

  // 주기적 토큰 만료 확인 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isTokenExpired()) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        clearSession();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { clearSession(); };

  const handleTabClick = (tab) => {
    // 탭 클릭 시 다시 한번 role 검증
    if (!tab.roles.includes(tokenRole)) {
      alert('접근 권한이 없습니다.');
      return;
    }
    setActiveTab(tab.id);
  };

  const renderContent = () => {
    // 렌더링 전 권한 재확인
    const tab = ALL_TABS.find(t => t.id === activeTab);
    if (!tab || !tab.roles.includes(tokenRole)) return null;

    switch (activeTab) {
      case 'admin':       return <AdminContent />;
      case 'record':      return <RecordContent />;
      case 'settlement':  return <SettlementContent />;
      case 'ginseng':     return <GinsengContent />;
      case 'guide-admin': return <GuideAdminContent />;
      case 'guide-form':  return <GuideFormContent />;
      case 'sales':       return <SalesContent />;
      case 'dev':         return <DevContent />;
      default:            return null;
    }
  };

  return (
    <div className="layout-wrapper">
      <nav className="layout-nav">
        <div className="nav-left">
          <span className="nav-logo">🗺️</span>
          <span className="nav-title">서울시티투어</span>
        </div>
        <div className="nav-right">
          {tokenRole && (
            <span className={`badge ${ROLE_STYLE[tokenRole]?.cls}`}>
              {ROLE_STYLE[tokenRole]?.label}
            </span>
          )}
          <span className="nav-user">{name}</span>
          <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
        </div>
      </nav>

      <div className="tab-bar">
        {visibleTabs.map(tab => (
          <button key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="layout-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default AppLayout;
