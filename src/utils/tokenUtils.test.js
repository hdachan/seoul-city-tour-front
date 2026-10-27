// 로그인 유지(자동로그인) 저장 · 복원 · 로그아웃
import { saveLogin, restoreRememberedLogin, clearSession, expireSession } from "./tokenUtils";

// exp 만 들어있는 가짜 토큰 (서명은 백엔드에서 검사)
const fakeToken = (expSec) =>
  `h.${btoa(JSON.stringify({ sub: "kim", role: "ROLE_SALES", exp: expSec }))}.s`;
const now = () => Math.floor(Date.now() / 1000);
const DATA = { token: fakeToken(now() + 3600), username: "kim", name: "김영업" };

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

test("로그인 유지 안 함 → 이번 창(sessionStorage)에만 저장", () => {
  saveLogin(DATA, false);
  expect(sessionStorage.getItem("token")).toBe(DATA.token);
  expect(localStorage.getItem("token")).toBeNull();
});

test("로그인 유지 → 창을 새로 열어도(sessionStorage 비어도) 복원", () => {
  saveLogin(DATA, true);
  sessionStorage.clear(); // 창 닫았다 다시 연 상황
  restoreRememberedLogin();
  expect(sessionStorage.getItem("token")).toBe(DATA.token);
  expect(sessionStorage.getItem("username")).toBe("kim");
  expect(sessionStorage.getItem("name")).toBe("김영업");
});

test("유지된 토큰이 만료됐으면 복원 안 하고 지움", () => {
  saveLogin({ ...DATA, token: fakeToken(now() - 10) }, true);
  sessionStorage.clear();
  restoreRememberedLogin();
  expect(sessionStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("token")).toBeNull();
});

test("유지 안 함으로 다시 로그인하면 예전 유지 기록 지움", () => {
  saveLogin(DATA, true);
  saveLogin(DATA, false);
  expect(localStorage.getItem("token")).toBeNull();
});

test("예전 탭의 토큰이 만료돼도, 다른 탭의 로그인 유지는 남고 그걸로 다시 들어감", () => {
  saveLogin(DATA, true); // 새 탭에서 로그인 유지
  sessionStorage.setItem("token", fakeToken(now() - 10)); // 이 탭은 예전 만료 토큰
  delete window.location;
  window.location = { href: "" };
  window.alert = jest.fn();
  expireSession("로그인이 만료되었습니다.");
  expect(localStorage.getItem("token")).toBe(DATA.token);
  expect(sessionStorage.getItem("token")).toBe(DATA.token);
  expect(window.location.href).toBe("/dashboard");
  expect(window.alert).not.toHaveBeenCalled();
});

test("로그인 유지가 없으면 만료 시 안내 후 로그인 화면", () => {
  sessionStorage.setItem("token", fakeToken(now() - 10));
  delete window.location;
  window.location = { href: "" };
  window.alert = jest.fn();
  expireSession("로그인이 만료되었습니다.");
  expect(window.alert).toHaveBeenCalledWith("로그인이 만료되었습니다.");
  expect(window.location.href).toBe("/");
});

test("로그아웃하면 로그인 유지도 해제", () => {
  saveLogin(DATA, true);
  delete window.location;
  window.location = { href: "" };
  clearSession();
  expect(sessionStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("token")).toBeNull();
  expect(window.location.href).toBe("/");
});
