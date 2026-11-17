import {
  calendarWeeks,
  dateLabel,
  dateRows,
  dayStatus,
  guideRows,
  headcountText,
  onlyDate,
  onlyGuide,
  optionGroups,
  search,
  totals,
} from "./guideDetailStats";

const data = {
  guides: [
    { username: "lee", name: "이가이드" },
    { username: "kim", name: "김가이드" },
    { username: "park", name: "박가이드" }, // 이 달 기록 없음
  ],
  incomes: [
    // 현금 100,000 = 투어 80,000 + 북한관 옵션 20,000(현금)
    { id: 1, guideUsername: "kim", date: "2026-11-07", tourName: "DMZ하프", representativeName: "Smith",
      paymentType: "현금", totalAmount: 100000, cashIn: 80000, cardIn: 0, headcount: 3, adult: 2, child: 1, infant: 0,
      memo: "", note: "", options: [{ optionName: "북한관", amount: 20000, paymentType: "현금", cashAmount: 20000, cardAmount: 0 }] },
    // 그외-교차: 현금 30,000 / 카드 20,000, 옵션 교차 (현금 5,000 / 카드 5,000)
    { id: 2, guideUsername: "lee", date: "2026-11-07", tourName: "모닝투어", representativeName: "anna",
      paymentType: "그외-교차", totalAmount: 60000, cashIn: 30000, cardIn: 20000, headcount: 2, adult: 2,
      memo: "늦게 옴", note: "", options: [{ optionName: "기타 점심", amount: 10000, paymentType: "교차", cashAmount: 5000, cardAmount: 5000 }] },
    // 완불 90,000 + 현장에서 낸 옵션 JSA 15,000(카드) → 완불 칸은 90,000 (옵션은 옵션 칸)
    { id: 3, guideUsername: "kim", date: "2026-11-08", tourName: "DMZ하프", representativeName: "Brown",
      paymentType: "완불", totalAmount: 105000, cashIn: 0, cardIn: 0, headcount: 1, adult: 1, memo: "", note: "",
      options: [{ optionName: "JSA", amount: 15000, paymentType: "카드", cashAmount: 0, cardAmount: 15000 }] },
  ],
  expenses: [
    { id: 11, guideUsername: "kim", date: "2026-11-07", tourName: "DMZ하프", expenseType: "북한책", paymentType: "현금", amount: 10000, headcount: 2, totalAmount: 20000, memo: "" },
    { id: 12, guideUsername: "lee", date: "2026-11-07", tourName: "모닝투어", expenseType: "입장료", paymentType: "법인카드", amount: 5000, headcount: 2, totalAmount: 10000, memo: "" },
  ],
  dailyFees: [
    { id: 21, guideUsername: "kim", date: "2026-11-07", amount: 50000 },
    { id: 22, guideUsername: "kim", date: "2026-11-09", amount: 50000 }, // 수입 없는 날 일비
  ],
};

test("합계: 정산관리 합계 칸과 같은 기준", () => {
  expect(totals(data)).toEqual({
    count: 3,
    headcount: 6,
    cash: 110000, // 80,000 + 교차 현금 30,000 (옵션 · 완불 빠짐)
    card: 20000,
    optCash: 25000,
    optCard: 20000, // 교차 5,000 + 완불 건 JSA 15,000
    wanbul: 90000, // 완불 건 옵션은 빠짐
    expCash: 20000,
    expCard: 10000, // 법인카드도 카드 지출
    dailyFee: 100000,
    net: 90000, // 110,000 − 20,000
  });
});

test("① 가이드별 한 줄: 가나다순, 기록 없는 가이드도 나옴", () => {
  const rows = guideRows(data);
  expect(rows.map((r) => r.name)).toEqual(["김가이드", "박가이드", "이가이드"]);
  expect(rows[0]).toMatchObject({ username: "kim", days: 3 }); // 7 · 8 · 9일 (9일은 일비만)
  expect(rows[0].t).toMatchObject({ count: 2, cash: 80000, optCash: 20000, wanbul: 90000, expCash: 20000, dailyFee: 100000, net: 60000 });
  expect(rows[1]).toMatchObject({ days: 0 });
  expect(rows[1].t.count).toBe(0);
  expect(rows[2].t).toMatchObject({ cash: 30000, card: 20000, optCash: 5000, optCard: 5000, expCard: 10000 });
});

test("② 날짜별 한 줄 합 = 그 가이드 한 달 합계", () => {
  const kim = onlyGuide(data, "kim");
  const rows = dateRows(kim);
  expect(rows.map((r) => r.date)).toEqual(["2026-11-07", "2026-11-08", "2026-11-09"]);
  expect(rows[0].t).toMatchObject({ count: 1, cash: 80000, expCash: 20000, dailyFee: 50000 });
  expect(rows[2].t).toMatchObject({ count: 0, dailyFee: 50000 });
  const add = (k) => rows.reduce((s, r) => s + r.t[k], 0);
  for (const k of ["count", "cash", "card", "optCash", "optCard", "wanbul", "expCash", "expCard", "dailyFee", "net"])
    expect(add(k)).toBe(totals(kim)[k]);
});

test("③ 하루치", () => {
  const day = onlyDate(onlyGuide(data, "kim"), "2026-11-07");
  expect(day.incomes.map((i) => i.id)).toEqual([1]);
  expect(day.expenses.map((e) => e.id)).toEqual([11]);
  expect(day.dailyFees.map((d) => d.id)).toEqual([21]);
});

test("검색: 대표자 (대소문자 무시) · 비고 · 옵션 이름 · 지출 항목", () => {
  expect(search(data, "SMITH").incomes.map((i) => i.id)).toEqual([1]);
  expect(search(data, "늦게").incomes.map((i) => i.id)).toEqual([2]);
  expect(search(data, "북한관").incomes.map((i) => i.id)).toEqual([1]);
  expect(search(data, "북한책").expenses.map((e) => e.id)).toEqual([11]);
  expect(search(data, "  ")).toEqual({ incomes: [], expenses: [] });
});

test("달력: 2026년 11월은 일요일 시작 · 30일 · 5주, 10월은 목요일 시작", () => {
  const weeks = calendarWeeks(2026, 11);
  expect(weeks).toHaveLength(5);
  expect(weeks[0][0]).toBe("2026-11-01");
  expect(weeks[4][1]).toBe("2026-11-30");
  expect(weeks[4][2]).toBeNull();
  expect(calendarWeeks(2026, 10)[0].slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
});

test("옵션별 묶음: 이름별 건수 · 현금 / 카드, 번호는 넣은 순서", () => {
  const incomes = [
    { id: 9, representativeName: "C", options: [{ optionName: "북한관", amount: 10000, paymentType: "카드", cashAmount: 0, cardAmount: 10000 }] },
    { id: 3, representativeName: "A", options: [
      { optionName: "북한관", amount: 20000, paymentType: "현금", cashAmount: 20000, cardAmount: 0 },
      { optionName: "JSA", amount: 10000, paymentType: "교차", cashAmount: 4000, cardAmount: 6000 },
    ] },
    { id: 5, representativeName: "B", options: [] },
  ];
  const g = optionGroups(incomes);
  expect(g.map((x) => x.name)).toEqual(["북한관", "JSA"]);
  expect(g[0]).toMatchObject({ count: 2, cash: 20000, card: 10000 });
  expect(g[0].rows.map((r) => [r.no, r.rep])).toEqual([[1, "A"], [3, "C"]]);
  expect(g[1]).toMatchObject({ count: 1, cash: 4000, card: 6000 });
  expect(optionGroups([])).toEqual([]);
});

test("글자", () => {
  expect(dateLabel("2026-11-07")).toBe("11월 7일 (토)");
  expect(headcountText({ adult: 2, child: 1, infant: 0 })).toBe("어2 아1");
  expect(headcountText({ adult: 3 })).toBe("3명");
  expect(headcountText({ headcount: 4 })).toBe("4명");
});

test("미니 달력 색: 수입 / 지출 · 일비만 / 없음 / 앞날", () => {
  const kim = onlyGuide(data, "kim");
  expect(dayStatus(kim, "2026-11-07", "2026-11-17")).toBe("income");
  expect(dayStatus(kim, "2026-11-09", "2026-11-17")).toBe("other"); // 일비만
  expect(dayStatus(kim, "2026-11-10", "2026-11-17")).toBe("none");
  expect(dayStatus(kim, "2026-11-20", "2026-11-17")).toBe("future");
});
