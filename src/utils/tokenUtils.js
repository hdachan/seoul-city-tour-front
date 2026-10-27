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

// ── 로그인 유지 (자동로그인) ──
// 평소에는 sessionStorage(창 닫으면 로그아웃)만 쓰고,
// "로그인 유지"를 체크하면 같은 값을 localStorage 에도 둠 → 다음에 열 때 sessionStorage 로 복사
const REMEMBER_KEYS = ["token", "username", "name"];

function safeLocal(fn) {
  try {
    return fn(window.localStorage);
  } catch {
    return null; // 사파리 개인정보 보호 모드 등 저장소를 못 쓰면 그냥 로그인 유지 없이
  }
}

// 로그인 성공 시 저장
export function saveLogin(data, remember) {
  REMEMBER_KEYS.forEach((k) => sessionStorage.setItem(k, data[k]));
  safeLocal((ls) =>
    REMEMBER_KEYS.forEach((k) => (remember ? ls.setItem(k, data[k]) : ls.removeItem(k))),
  );
}

// 앱 시작 시: 유지된 로그인이 있고 만료 전이면 이번 창에서도 로그인 상태로
export function restoreRememberedLogin() {
  if (sessionStorage.getItem("token")) return;
  safeLocal((ls) => {
    const token = ls.getItem("token");
    if (!token) return;
    const payload = parseToken(token);
    if (!payload?.role || !payload?.exp || Date.now() / 1000 > payload.exp) {
      REMEMBER_KEYS.forEach((k) => ls.removeItem(k)); // 만료 → 다시 로그인
      return;
    }
    REMEMBER_KEYS.forEach((k) => {
      const v = ls.getItem(k);
      if (v !== null) sessionStorage.setItem(k, v);
    });
  });
}

// 로그아웃 버튼 - 로그인 유지도 같이 해제
export function clearSession() {
  sessionStorage.clear();
  safeLocal((ls) => REMEMBER_KEYS.forEach((k) => ls.removeItem(k)));
  window.location.href = "/";
}

// 토큰 만료로 나갈 때 - 이 탭만 로그아웃
//   (예전에 열어둔 탭의 토큰이 만료돼도, 다른 탭에서 새로 한 로그인 유지는 지우지 않음)
//   유지된 로그인이 아직 살아 있으면 바로 그걸로 다시 들어감
//   message: 로그인 화면으로 갈 때만 띄울 안내
export function expireSession(message) {
  sessionStorage.clear();
  restoreRememberedLogin();
  if (sessionStorage.getItem("token")) {
    window.location.href = "/dashboard";
    return;
  }
  if (message) alert(message);
  window.location.href = "/";
}

