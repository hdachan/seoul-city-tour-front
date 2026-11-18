import { dayCount, holidayRange, holidayRuns, periodLabel, runByDate, savePlan } from "./salesHoliday";

test("기간 날짜 목록: 거꾸로 골라도 앞 → 뒤, 달 넘어가도 이어짐", () => {
  expect(holidayRange("2026-11-29", "2026-12-02")).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
  expect(holidayRange("2026-11-12", "2026-11-10")).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
  expect(dayCount("2026-11-11", "2026-11-11")).toBe(1);
  expect(dayCount("2026-11-29", "2026-12-02")).toBe(4);
});

test("연달아 같은 사유인 날은 한 묶음, 사유가 다르거나 하루 띄면 따로", () => {
  const runs = holidayRuns([
    { date: "2026-11-12", reason: "병원" },
    { date: "2026-11-11", reason: "병원" },
    { date: "2026-11-13", reason: "여행" },
    { date: "2026-11-14", reason: "여행" },
    { date: "2026-11-16", reason: "여행" },
  ]);
  expect(runs.map((r) => [r.start, r.end, r.reason, r.days.length])).toEqual([
    ["2026-11-11", "2026-11-12", "병원", 2],
    ["2026-11-13", "2026-11-14", "여행", 2],
    ["2026-11-16", "2026-11-16", "여행", 1],
  ]);
  const at = runByDate(holidayRuns([
    { date: "2026-11-24", reason: "연차" },
    { date: "2026-11-25", reason: "연차" },
    { date: "2026-11-26", reason: "연차" },
    { date: "2026-11-28", reason: "x" },
  ]));
  expect([at["2026-11-24"].pos, at["2026-11-25"].pos, at["2026-11-26"].pos, at["2026-11-28"].pos]).toEqual([
    "start", "mid", "end", "single",
  ]);
});

test("고칠 때: 기간에서 빠진 날은 지우고 새 기간은 저장", () => {
  expect(savePlan("2026-11-12", "2026-11-14", ["2026-11-11", "2026-11-12", "2026-11-13"])).toEqual({
    save: ["2026-11-12", "2026-11-13", "2026-11-14"],
    remove: ["2026-11-11"],
  });
  expect(savePlan("2026-11-20", "2026-11-20")).toEqual({ save: ["2026-11-20"], remove: [] });
});

test("기간 글자", () => {
  expect(periodLabel("2026-11-11", "2026-11-11")).toBe("11월 11일 (수)");
  expect(periodLabel("2026-11-11", "2026-11-12")).toBe("11월 11일 (수) ~ 12일 (목)");
  expect(periodLabel("2026-11-30", "2026-12-01")).toBe("11월 30일 (월) ~ 12월 1일 (화)");
});
