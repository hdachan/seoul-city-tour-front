import { useState, useEffect, useCallback } from "react";
import {
  getRoleFromToken,
  isTokenExpired,
  clearSession,
} from "../utils/tokenUtils";
import AdminContent from "./tabs/AdminContent";
import RecordContent from "./tabs/RecordContent";
import SettlementContent from "./tabs/SettlementContent";
import GinsengContent from "./tabs/GinsengContent";
import GuideAdminContent from "./tabs/GuideAdminContent";
import SalesAdminContent from "./tabs/salesAdmincomponent/SalesAdminContent";
import SalesContent from "./tabs/salesAdmincomponent/SalesContent";

import GuideFormContent from "./tabs/GuideFormContent";

import DevContent from "./tabs/DevContent";
import axios from "axios";
import "./AppLayout.css";

const BASE_URL = process.env.REACT_APP_API_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});

const ALL_TABS = [
  { id: "admin", icon: "👥", label: "계정 관리" },
  { id: "record", icon: "📋", label: "운행 기록" },
  { id: "settlement", icon: "💰", label: "업체별 정산" },
  { id: "ginseng", icon: "🌿", label: "인삼 매출" },
  { id: "guide-admin", icon: "📂", label: "가이드 정산관리" },
  { id: "sales-admin", icon: "📊", label: "영업 정산관리" },
  { id: "guide-form", icon: "📝", label: "가이드 정산" },
  { id: "sales", icon: "💼", label: "영업 정산" },
  { id: "dev", icon: "⚙️", label: "개발" },
];

const ROLE_LABEL = {
  ROLE_ADMIN: "관리자",
  ROLE_SALES: "영업",
  ROLE_GUIDE: "가이드",
  ROLE_DEV: "개발자",
};

export default function AppLayout() {
  const role = getRoleFromToken();
  const name =
    sessionStorage.getItem("name") || sessionStorage.getItem("username") || "";

  const [allowedTabIds, setAllowedTabIds] = useState([]);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false); // 모바일 더보기 메뉴

  const loadPermissions = useCallback(async () => {
    try {
      const stored = sessionStorage.getItem("allowedTabs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllowedTabIds(parsed);
          setActive(parsed[0]);
          setLoading(false);
          return;
        }
      }
    } catch {}

    try {
      const res = await axios.get(
        `${BASE_URL}/dev/permissions/${encodeURIComponent(role)}`,
        authHeader(),
      );
      const tabs = res.data.allowedTabs || [];
      sessionStorage.setItem("allowedTabs", JSON.stringify(tabs));
      setAllowedTabIds(tabs);
      setActive(tabs[0] || "");
    } catch {
      const fallback = {
        ROLE_ADMIN: [
          "admin",
          "record",
          "settlement",
          "ginseng",
          "guide-admin",
          "sales-admin",
        ],
        ROLE_DEV: [
          "record",
          "settlement",
          "ginseng",
          "guide-admin",
          "sales-admin",
          "dev",
        ],
        ROLE_SALES: ["sales"],
        ROLE_GUIDE: ["guide-form"],
      };
      const tabs = fallback[role] || [];
      setAllowedTabIds(tabs);
      setActive(tabs[0] || "");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (!role || isTokenExpired()) {
      clearSession();
      return;
    }
    loadPermissions();
  }, [loadPermissions, role]);

  useEffect(() => {
    const timer = setInterval(
      () => {
        if (isTokenExpired()) {
          alert("로그인이 만료되었습니다.");
          clearSession();
        }
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(timer);
  }, []);

  const visibleTabs = ALL_TABS.filter((t) => allowedTabIds.includes(t.id));
  const currentItem = ALL_TABS.find((n) => n.id === active);
  const roleLabel = ROLE_LABEL[role] || role?.replace("ROLE_", "") || "";

  // 모바일 바텀 네비: 최대 4개 + 더보기
  const bottomTabs = visibleTabs.slice(0, 4);
  const extraTabs = visibleTabs.slice(4);

  const handleTabClick = (id) => {
    setActive(id);
    setMenuOpen(false);
  };

  const renderContent = () => {
    if (!allowedTabIds.includes(active)) return null;
    switch (active) {
      case "admin":
        return <AdminContent />;
      case "record":
        return <RecordContent />;
      case "settlement":
        return <SettlementContent />;
      case "ginseng":
        return <GinsengContent />;
      case "guide-admin":
        return <GuideAdminContent />;
      case "sales-admin":
        return <SalesAdminContent />;
      case "guide-form":
        return <GuideFormContent />;
      case "sales":
        return <SalesContent />;
      case "dev":
        return <DevContent />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f5f7",
        }}
      >
        <div style={{ fontSize: "14px", color: "#888" }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="al-root">
      {/* 헤더 */}
      <header className="al-header">
        <div className="al-header-left">
          <span className="al-logo">🗺</span>
          <span className="al-brand">서울시티투어</span>
        </div>
        <div className="al-header-right">
          <span className="al-role-badge">{roleLabel}</span>
          <span className="al-username">{name}</span>
          <button className="al-logout" onClick={clearSession}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="al-body">
        {/* 데스크탑 사이드바 */}
        <nav className="al-sidebar">
          <div className="al-nav-section">메뉴</div>
          {visibleTabs.map((item) => (
            <button
              key={item.id}
              className={`al-nav-item ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
            >
              <span className="al-nav-icon">{item.icon}</span>
              <span className="al-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 메인 */}
        <main className="al-main">
          <div className="al-page-title">
            <span className="al-page-icon">{currentItem?.icon}</span>
            <span>{currentItem?.label}</span>
          </div>
          <div className="al-content">{renderContent()}</div>
        </main>
      </div>

      {/* 모바일 바텀 네비게이션 */}
      <nav className="al-bottom-nav">
        <div className="al-bottom-nav-inner">
          {bottomTabs.map((item) => (
            <button
              key={item.id}
              className={`al-bottom-item ${active === item.id ? "active" : ""}`}
              onClick={() => handleTabClick(item.id)}
            >
              <span className="al-bottom-icon">{item.icon}</span>
              <span className="al-bottom-label">{item.label}</span>
            </button>
          ))}
          {extraTabs.length > 0 && (
            <button
              className={`al-bottom-item ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="al-bottom-icon">☰</span>
              <span className="al-bottom-label">더보기</span>
            </button>
          )}
        </div>
        {/* 더보기 메뉴 */}
        {menuOpen && (
          <div
            style={{
              background: "#fff",
              borderTop: "1px solid #e8eaed",
              padding: "8px 0",
            }}
          >
            {extraTabs.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  padding: "12px 20px",
                  border: "none",
                  background: active === item.id ? "#e8f0fe" : "transparent",
                  color: active === item.id ? "#1557b0" : "#555",
                  fontSize: "14px",
                  fontWeight: active === item.id ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "18px" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
