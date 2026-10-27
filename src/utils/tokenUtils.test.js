// 로그인 유지(자동로그인) 저장 · 복원 · 로그아웃
import { saveLogin, restoreRememberedLogin, clearSession } from "./tokenUtils";

// exp 만 들어있는 가짜 토큰 (서명은 백엔드에서 검사)
const fakeToken = (expSec) => `h.${btoa(JSON.stringify({ sub: "kim", exp: expSec }))}.s`;
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

test("로그아웃하면 로그인 유지도 해제", () => {
  saveLogin(DATA, true);
  delete window.location;
  window.location = { href: "" };
  clearSession();
  expect(sessionStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("token")).toBeNull();
  expect(window.location.href).toBe("/");
});
