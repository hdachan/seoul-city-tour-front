import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SalesHolidayTab from "./SalesHolidayTab";
import { salesHolidayApi } from "../../../api/sales";

jest.mock("../../../api/sales", () => ({
  salesHolidayApi: { getMine: jest.fn(), save: jest.fn(), remove: jest.fn() },
}));
const ok = (data) => Promise.resolve({ data });
// jsdom 에는 PointerEvent 가 없어 pointerType 이 안 넘어감 → 테스트용으로 채움
if (!window.PointerEvent) {
  window.PointerEvent = class extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerType = init.pointerType || "";
    }
  };
}
const now = new Date();
const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const cell = (d) => document.querySelector(`[data-date="${ym}-${d}"]`);
const press = (d) => fireEvent.keyDown(cell(d), { key: "Enter" });

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  salesHolidayApi.getMine.mockImplementation(() =>
    ok([
      { date: `${ym}-11`, reason: "병원" },
      { date: `${ym}-12`, reason: "병원" },
    ]),
  );
  salesHolidayApi.save.mockImplementation((date, reason) => ok({ date, reason }));
  salesHolidayApi.remove.mockImplementation(() => ok({}));
});

const ready = async () => {
  render(<SalesHolidayTab />);
  await waitFor(() => expect(cell("11").className).toContain("is-off"));
};

test("연달아 쉬는 날은 한 띠: 시작 칸에만 사유 · 일수, 목록은 기간 한 줄", async () => {
  await ready();
  expect(cell("11").querySelector(".shd-band").className).toContain("pos-start");
  expect(cell("12").querySelector(".shd-band").className).toContain("pos-end");
  expect(cell("11").textContent).toContain("병원 · 2일");
  expect(screen.getByText("2일", { selector: "em" })).toBeInTheDocument();
});

test("시작 날 → 끝나는 날 차례로 누르면 기간, 같은 사유로 하루씩 저장", async () => {
  await ready();
  press("20");
  expect(screen.getByText(/다른 날을 누르면/)).toBeInTheDocument();
  press("22");
  expect(screen.getByLabelText("시작 날").value).toBe(`${ym}-20`);
  expect(screen.getByLabelText("끝나는 날").value).toBe(`${ym}-22`);
  fireEvent.change(screen.getByPlaceholderText(/휴무 사유/), { target: { value: "가족 여행" } });
  fireEvent.click(screen.getByText("3일 휴무 저장"));
  await screen.findByText(/휴무를 저장했습니다/);
  expect(salesHolidayApi.save.mock.calls).toEqual([
    [`${ym}-20`, "가족 여행"],
    [`${ym}-21`, "가족 여행"],
    [`${ym}-22`, "가족 여행"],
  ]);
});

test("끌어서(드래그) 기간 고르기", async () => {
  await ready();
  fireEvent.pointerDown(cell("05"), { pointerType: "mouse", button: 0 });
  fireEvent.pointerEnter(cell("06"), { pointerType: "mouse" });
  fireEvent.pointerEnter(cell("07"), { pointerType: "mouse" });
  fireEvent.pointerUp(window);
  expect(screen.getByLabelText("시작 날").value).toBe(`${ym}-05`);
  expect(screen.getByLabelText("끝나는 날").value).toBe(`${ym}-07`);
  expect(screen.getByText("3일 휴무 저장")).toBeInTheDocument();
});

test("휴무 띠를 누르면 기간 전체 고치기: 줄이면 빠진 날 지움, 취소는 기간 전체", async () => {
  await ready();
  press("12");
  expect(screen.getByText("🏖 휴무 고치기")).toBeInTheDocument();
  expect(screen.getByLabelText("시작 날").value).toBe(`${ym}-11`);
  fireEvent.change(screen.getByLabelText("시작 날"), { target: { value: `${ym}-12` } });
  fireEvent.click(screen.getByText("휴무 저장"));
  await screen.findByText(/휴무를 저장했습니다/);
  expect(salesHolidayApi.remove.mock.calls).toEqual([[`${ym}-11`]]);
  expect(salesHolidayApi.save.mock.calls).toEqual([[`${ym}-12`, "병원"]]);

  salesHolidayApi.remove.mockClear();
  press("11");
  fireEvent.click(screen.getByText("휴무 취소 (2일)"));
  await screen.findByText(/휴무를 취소했습니다/);
  expect(salesHolidayApi.remove.mock.calls).toEqual([[`${ym}-11`], [`${ym}-12`]]);
});

test("사유 없이 저장하면 막음", async () => {
  await ready();
  press("20");
  fireEvent.click(screen.getByText("휴무 저장"));
  expect(await screen.findByText(/휴무 사유를 적어주세요/)).toBeInTheDocument();
  expect(salesHolidayApi.save).not.toHaveBeenCalled();
});
