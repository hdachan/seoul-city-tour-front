import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminContent from "./tabs/AdminContent";
import RecordContent from "./tabs/RecordContent";
import { SalesContent, GuideContent, DevContent } from "./tabs/OtherContents";
import "./AppLayout.css";

// ── 탭 정의 ──────────────────────────────────
// roles: 해당 탭을 볼 수 있는 역할
const ALL_TABS = [
  { id: "admin", label: "👥 계정 관리", roles: ["ADMIN"] },
  { id: "record", label: "📋 운행 기록", roles: ["ADMIN", "DEV"] },
  { id: "sales", label: "💼 영업", roles: ["SALES"] },
  { id: "guide", label: "📖 가이드", roles: ["GUIDE"] },
  { id: "dev", label: "💻 개발", roles: ["DEV"] },
];

// 역할 → 뱃지 스타일
const ROLE_STYLE = {
  ADMIN: { label: "관리자", cls: "badge-admin" },
  SALES: { label: "영업", cls: "badge-sales" },
  GUIDE: { label: "가이드", cls: "badge-guide" },
  DEV: { label: "개발자", cls: "badge-dev" },
};

function AppLayout() {
  const navigate = useNavigate();
  const roles = sessionStorage.getItem("roles") || "";
  const username = sessionStorage.getItem("username") || "";

  // 내 역할 추출 (ADMIN, SALES 등)
  const myRoles = Object.keys(ROLE_STYLE).filter((r) => roles.includes(r));
  const mainRole = myRoles[0] || "";

  // 내가 볼 수 있는 탭만 필터링
  const visibleTabs = ALL_TABS.filter((tab) =>
    tab.roles.some((r) => roles.includes(r)),
  );

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || "");

  useEffect(() => {
    if (!roles) navigate("/");
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "admin":
        return <AdminContent />;
      case "record":
        return <RecordContent />;
      case "sales":
        return <SalesContent />;
      case "guide":
        return <GuideContent />;
      case "dev":
        return <DevContent />;
      default:
        return null;
    }
  };

  return (
    <div className="layout-wrapper">
      {/* 네비 */}
      <nav className="layout-nav">
        <div className="nav-left">
          <span className="nav-logo">🗺️</span>
          <span className="nav-title">서울시티투어</span>
        </div>
        <div className="nav-right">
          {mainRole && (
            <span className={`badge ${ROLE_STYLE[mainRole]?.cls}`}>
              {ROLE_STYLE[mainRole]?.label}
            </span>
          )}
          <span className="nav-user">{username}</span>
          <button className="logout-btn" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </nav>

      {/* 탭 바 */}
      <div className="tab-bar">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="layout-content">{renderContent()}</div>
    </div>
  );
}

export default AppLayout;
