import { renderHook, act } from "@testing-library/react";
import useToday, { useDateRollover } from "./useToday";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("자정이 지나면 오늘 날짜가 바뀐다", () => {
  jest.setSystemTime(new Date(2026, 9, 11, 23, 59, 58)); // 10/11 23:59:58
  const { result } = renderHook(() => useToday());
  expect(result.current).toBe("2026-10-11");

  act(() => jest.advanceTimersByTime(5000));
  expect(result.current).toBe("2026-10-12");
});

test("절전 등으로 알람을 놓쳐도 화면에 돌아오면 갱신된다", () => {
  jest.setSystemTime(new Date(2026, 9, 11, 22, 0, 0));
  const { result } = renderHook(() => useToday());
  expect(result.current).toBe("2026-10-11");

  // 타이머 없이 시계만 다음 날로 (절전 상황)
  jest.setSystemTime(new Date(2026, 9, 12, 9, 0, 0));
  act(() => window.dispatchEvent(new Event("focus")));
  expect(result.current).toBe("2026-10-12");
});

test("날짜가 바뀌면 rollover 콜백이 (이전, 새) 날짜로 한 번 호출된다", () => {
  jest.setSystemTime(new Date(2026, 9, 31, 23, 59, 59)); // 월말
  const onRollover = jest.fn();
  renderHook(() => useDateRollover(onRollover));
  expect(onRollover).not.toHaveBeenCalled();

  act(() => jest.advanceTimersByTime(5000));
  expect(onRollover).toHaveBeenCalledTimes(1);
  expect(onRollover).toHaveBeenCalledWith("2026-10-31", "2026-11-01");
});
