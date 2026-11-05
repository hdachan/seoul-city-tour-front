import { render, screen } from "@testing-library/react";
import LockedDate, { weekdayOf, withWeekday } from "./LockedDate";

test("날짜 뒤에 요일 표시", () => {
  expect(withWeekday("2026-10-15")).toBe("2026-10-15 (목)");
  expect(withWeekday("2026-11-01")).toBe("2026-11-01 (일)");
  expect(withWeekday("2026-11-07")).toBe("2026-11-07 (토)");
});

test("캘린더 옆 요일", () => {
  expect(weekdayOf("2026-11-05")).toBe("목");
  expect(weekdayOf("")).toBe("");
});

test("날짜가 없거나 이상하면 그대로", () => {
  expect(withWeekday("")).toBe("");
  expect(withWeekday("없음")).toBe("없음");
});

test("입력창 날짜 칸은 바꿀 수 없음", () => {
  render(<LockedDate value="2026-10-15" />);
  const input = screen.getByDisplayValue("2026-10-15 (목)");
  expect(input).toHaveAttribute("readonly");
  expect(input).toHaveAttribute("type", "text");
});
