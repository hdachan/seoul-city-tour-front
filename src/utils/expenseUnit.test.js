import {
  isBookExpense,
  expenseUnit,
  expenseAmountLabel,
  expenseCountLabel,
} from "./expenseUnit";

test("북한책만 권수로", () => {
  expect(isBookExpense("북한책")).toBe(true);
  expect(expenseUnit("북한책")).toBe("권");
  expect(expenseAmountLabel("북한책")).toBe("금액 (1권)");
  expect(expenseCountLabel("북한책")).toBe("권수");
});

test("다른 항목은 그대로 인원", () => {
  for (const t of ["북한관 입장료", "dmz입장료", "책", "DMZ책", "", undefined]) {
    expect(isBookExpense(t)).toBe(false);
    expect(expenseUnit(t)).toBe("명");
    expect(expenseAmountLabel(t)).toBe("금액 (1인)");
    expect(expenseCountLabel(t)).toBe("인원");
  }
});
