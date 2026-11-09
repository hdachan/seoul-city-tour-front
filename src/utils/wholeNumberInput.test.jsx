import { render, screen, createEvent, fireEvent } from "@testing-library/react";
import { wholeNumberProps } from "./wholeNumberInput";

const setup = () => {
  render(<input type="number" aria-label="칸" {...wholeNumberProps} />);
  return screen.getByLabelText("칸");
};
const blocked = (input, ev) => {
  fireEvent(input, ev);
  return ev.defaultPrevented;
};

test("음수 · 소수 글자는 못 치고 숫자는 됨", () => {
  const input = setup();
  expect(input).toHaveAttribute("min", "0");
  for (const key of ["-", "+", "e", "."]) expect(blocked(input, createEvent.keyDown(input, { key }))).toBe(true);
  expect(blocked(input, createEvent.keyDown(input, { key: "3" }))).toBe(false);
});

test("붙여넣기는 숫자만", () => {
  const input = setup();
  const paste = (text) => createEvent.paste(input, { clipboardData: { getData: () => text } });
  expect(blocked(input, paste("-3"))).toBe(true);
  expect(blocked(input, paste("12"))).toBe(false);
});

test("커서 있는 칸에서 휠은 무시되고 커서는 그대로, 커서 없으면 페이지 스크롤", () => {
  const input = setup();
  expect(blocked(input, createEvent.wheel(input))).toBe(false);
  input.focus();
  expect(blocked(input, createEvent.wheel(input))).toBe(true);
  expect(input).toHaveFocus();
});
