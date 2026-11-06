import { render, screen, fireEvent } from "@testing-library/react";
import OptionStatsTable from "./OptionStatsTable";

const rows = [
  { name: "케이블카", count: 3, cash: 20000, card: 40000, total: 60000 },
  {
    name: "기타",
    count: 3,
    cash: 15000,
    card: 10000,
    total: 25000,
    details: [
      { name: "우산", count: 1, cash: 11000, card: 10000, total: 21000 },
      { name: "콜라", count: 2, cash: 4000, card: 0, total: 4000 },
    ],
  },
];

test("옵션별 합계, 기타는 누르면 적은 이름이 펼쳐짐", () => {
  render(<OptionStatsTable rows={rows} />);
  expect(screen.getByText("케이블카")).toBeInTheDocument();
  expect(screen.getByText("85,000원")).toBeInTheDocument(); // 전체 합계
  expect(screen.getByText("6건")).toBeInTheDocument();
  expect(screen.queryByText("└ 콜라")).toBeNull();
  fireEvent.click(screen.getByText(/기타/));
  expect(screen.getByText("└ 콜라")).toBeInTheDocument();
  expect(screen.getByText("└ 우산")).toBeInTheDocument();
  fireEvent.click(screen.getByText(/기타/));
  expect(screen.queryByText("└ 콜라")).toBeNull();
});

test("옵션 기록이 없으면 안내", () => {
  render(<OptionStatsTable rows={[]} />);
  expect(screen.getByText("이번 달 옵션 기록이 없어요.")).toBeInTheDocument();
});
