import { useState, useEffect } from 'react';
import { getRoleFromToken, isTokenExpired, clearSession } from '../utils/tokenUtils';
import AdminContent      from './tabs/AdminContent';
import RecordContent     from './tabs/RecordContent';
import SettlementContent from './tabs/SettlementContent';
import GinsengContent    from './tabs/GinsengContent';
import GuideAdminContent from './tabs/GuideAdminContent';
import SalesAdminContent from './tabs/SalesAdminContent';
import GuideFormContent  from './tabs/GuideFormContent';
import SalesContent      from './tabs/SalesContent';
import './AppLayout.css';

const NAV = [
  { id: 'admin',       icon: '👥', label: '계정 관리',       roles: ['ROLE_ADMIN'] },
  { id: 'record',      icon: '📋', label: '운행 기록',       roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'settlement',  icon: '💰', label: '업체별 정산',     roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'ginseng',     icon: '🌿', label: '인삼 매출',       roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'guide-admin', icon: '📂', label: '가이드 정산관리', roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'sales-admin', icon: '📊', label: '영업 정산관리',   roles: ['ROLE_ADMIN', 'ROLE_DEV'] },
  { id: 'guide-form',  icon: '📝', label: '가이드 정산',     roles: ['ROLE_GUIDE'] },
  { id: 'sales',       icon: '💼', label: '영업 정산',       roles: ['ROLE_SALES'] },
  { id: 'dev',         icon: '⚙️', label: '개발',             roles: ['ROLE_DEV'] },
];

const ROLE_LABEL = {
  ROLE_ADMIN: '관리자',
  ROLE_SALES: '영업',
  ROLE_GUIDE: '가이드',
  ROLE_DEV:   '개발자',
};

const CONTENT = {
  'admin':       <AdminContent />,
  'record':      <RecordContent />,
  'settlement':  <SettlementContent />,
  'ginseng':     <GinsengContent />,
  'guide-admin': <GuideAdminContent />,
  'sales-admin': <SalesAdminContent />,
  'guide-form':  <GuideFormContent />,
  'sales':       <SalesContent />,
};

export default function AppLayout() {
  const role       = getRoleFromToken();
  const name       = sessionStorage.getItem('name') || sessionStorage.getItem('username') || '';
  const visibleNav = NAV.filter(n => n.roles.includes(role));
  const [active, setActive] = useState(visibleNav[0]?.id || '');

  // 토큰 만료 체크
  useEffect(() => {
    if (!role || isTokenExpired()) { clearSession(); return; }
    const timer = setInterval(() => {
      if (isTokenExpired()) { alert('로그인이 만료되었습니다.'); clearSession(); }
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNav = (id) => {
    const item = NAV.find(n => n.id === id);
    if (!item?.roles.includes(role)) return;
    setActive(id);
  };

  const currentItem = NAV.find(n => n.id === active);

  return (
    <div className="al-root">
      {/* 상단 헤더 */}
      <header className="al-header">
        <div className="al-header-left">
          <span className="al-logo">🗺</span>
          <span className="al-brand">서울시티투어</span>
        </div>
        <div className="al-header-right">
          <span className="al-role-badge">{ROLE_LABEL[role]}</span>
          <span className="al-username">{name}</span>
          <button className="al-logout" onClick={clearSession}>로그아웃</button>
        </div>
      </header>

      <div className="al-body">
        {/* 왼쪽 사이드바 */}
        <nav className="al-sidebar">
          <div className="al-nav-section">메뉴</div>
          {visibleNav.map(item => (
            <button key={item.id}
              className={`al-nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}>
              <span className="al-nav-icon">{item.icon}</span>
              <span className="al-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 메인 컨텐츠 */}
        <main className="al-main">
          {/* 페이지 타이틀 */}
          <div className="al-page-title">
            <span className="al-page-icon">{currentItem?.icon}</span>
            <span>{currentItem?.label}</span>
          </div>

          {/* 컨텐츠 */}
          <div className="al-content">
            {active === 'admin'       && <AdminContent />}
            {active === 'record'      && <RecordContent />}
            {active === 'settlement'  && <SettlementContent />}
            {active === 'ginseng'     && <GinsengContent />}
            {active === 'guide-admin' && <GuideAdminContent />}
            {active === 'sales-admin' && <SalesAdminContent />}
            {active === 'guide-form'  && <GuideFormContent />}
            {active === 'sales'       && <SalesContent />}
            {active === 'dev'         && <div style={{color:'#888',padding:'2rem'}}>개발 탭</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
