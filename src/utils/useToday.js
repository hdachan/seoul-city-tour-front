import { useEffect, useRef, useState } from "react";
import { toDateStr } from "./dateUtils";

/**
 * 오늘 날짜 "YYYY-MM-DD" (화면을 켜둔 채 자정이 지나도 갱신)
 * - 자정 알람: 다음 자정에 한 번 갱신
 * - 돌아올 때 확인: 탭 전환/창 포커스/절전 해제 시 한 번 확인
 *   (절전 중에는 타이머가 멈출 수 있어서 필요)
 */
export default function useToday() {
  const [today, setToday] = useState(() => toDateStr());

  useEffect(() => {
    const refresh = () => {
      const now = toDateStr();
      setToday((prev) => (prev === now ? prev : now));
    };

    // 다음 자정 + 1초 뒤 갱신
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1,
    );
    const timer = setTimeout(refresh, nextMidnight - now);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [today]); // 날짜가 바뀌면 다음 자정 알람을 다시 예약

  return today;
}

/**
 * 날짜가 바뀌는 순간(자정 / 절전 해제 후 복귀) onRollover(이전날짜, 새날짜) 실행
 * 예) 오늘을 보고 있던 화면을 새 오늘로 옮기고, 잠금 상태 다시 불러오기
 */
export function useDateRollover(onRollover) {
  const today = useToday();
  const prevRef = useRef(today);
  const callbackRef = useRef(onRollover);
  callbackRef.current = onRollover;

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === today) return;
    prevRef.current = today;
    callbackRef.current(prev, today);
  }, [today]);

  return today;
}
