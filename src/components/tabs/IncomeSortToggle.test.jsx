import { render, screen, fireEvent } from "@testing-library/react";
import IncomeSortToggle, { sortIncomes } from "./IncomeSortToggle";

const rows = [
  { id: 3, representativeName: "charlie" },
  { id: 1, representativeName: "Zoe" },
  { id: 4, representativeName: "" },
  { id: 2, representativeName: "Adam" },
];
const ids = (l) => l.map((r) => r.id);

test("넣은 순서는 번호순, 알파벳순은 대소문자 무시 · 이름 없으면 맨 아래", () => {
  expect(ids(sortIncomes(rows, "넣은 순서"))).toEqual([1, 2, 3, 4]);
  expect(ids(sortIncomes(rows, "알파벳순"))).toEqual([2, 3, 1, 4]);
  expect(ids(rows)).toEqual([3, 1, 4, 2]); // 원본은 그대로
});

test("버튼을 누르면 정렬이 바뀜", () => {
  const onChange = jest.fn();
  render(<IncomeSortToggle value="넣은 순서" onChange={onChange} />);
  expect(screen.getByText("넣은 순서")).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByText("알파벳순"));
  expect(onChange).toHaveBeenCalledWith("알파벳순");
});
