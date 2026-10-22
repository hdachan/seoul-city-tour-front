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

// 로그아웃 (토큰 만료 시 자동 호출)
export function clearSession() {
  sessionStorage.clear();
  window.location.href = "/";
}

