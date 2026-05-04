/**
 * JWT 토큰 파싱 및 role 검증 유틸리티
 * 프론트에서 sessionStorage의 role만 믿지 않고
 * 토큰 자체에서 role을 직접 추출해서 사용
 */

// JWT payload 디코딩 (서명 검증은 백엔드에서)
export function parseToken(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// 토큰에서 role 추출
export function getRoleFromToken() {
  const token = sessionStorage.getItem("token");
  if (!token) return null;
  const payload = parseToken(token);
  return payload?.role || null;
}

// 토큰 만료 여부 확인
export function isTokenExpired() {
  const token = sessionStorage.getItem("token");
  if (!token) return true;
  const payload = parseToken(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

// 특정 role 보유 여부 (토큰 기반)
export function hasRole(role) {
  const tokenRole = getRoleFromToken();
  if (!tokenRole) return false;
  return tokenRole === role || tokenRole === `ROLE_${role}`;
}

// 여러 role 중 하나라도 있는지
export function hasAnyRole(roles) {
  return roles.some((role) => hasRole(role));
}

// 로그아웃 (토큰 만료 시 자동 호출)
export function clearSession() {
  sessionStorage.clear();
  window.location.href = "/";
}

// axios 요청 전 토큰 만료 확인
export function checkTokenBeforeRequest() {
  if (isTokenExpired()) {
    alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
    clearSession();
    return false;
  }
  return true;
}
