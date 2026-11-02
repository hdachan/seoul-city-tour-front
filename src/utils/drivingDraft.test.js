import { openDraft, saveDraft, clearAllDrafts } from "./drivingDraft";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.setItem("username", "kim");
});

const form = { type: "업무", meterReading: "1100" };

test("같은 날짜에서만 불러옴", () => {
  saveDraft(openDraft("kim", "업무", "2026-11-02"), form);
  expect(openDraft("kim", "업무", "2026-11-02").form).toEqual(form);
  expect(openDraft("kim", "업무", "2026-11-03").form).toBeNull();
});

test("로그인한 사람 · 정산 대상별로 따로 보관", () => {
  saveDraft(openDraft("sales1", "업무", "2026-11-02"), form);
  expect(openDraft("sales2", "업무", "2026-11-02").form).toBeNull();
  sessionStorage.setItem("username", "lee");
  expect(openDraft("sales1", "업무", "2026-11-02").form).toBeNull();
});

test("입력한 값이 없으면 보관하지 않음", () => {
  saveDraft(openDraft("kim", "업무", "2026-11-02"), {
    type: "업무",
    startDate: "2026-11-02",
    notes: [{ content: "", time: "" }],
  });
  expect(localStorage.length).toBe(0);
});

test("로그아웃 때 임시 값만 전부 지움", () => {
  localStorage.setItem("other", "1");
  saveDraft(openDraft("kim", "업무", "2026-11-02"), form);
  clearAllDrafts();
  expect(openDraft("kim", "업무", "2026-11-02").form).toBeNull();
  expect(localStorage.getItem("other")).toBe("1");
});

test("저장된 값이 깨져 있어도 빈 창으로 열림", () => {
  const { key } = openDraft("kim", "업무", "2026-11-02");
  localStorage.setItem(key, "{깨짐");
  expect(openDraft("kim", "업무", "2026-11-02").form).toBeNull();
});
