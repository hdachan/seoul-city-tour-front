// 🏖 영업 휴무 계산 (화면 없이 테스트 가능)
// 서버에는 하루 한 줄로 저장, 화면에서는 연달아 같은 사유인 날을 한 묶음(기간)으로 봄
import { toDateStr } from "../../../utils/dateUtils";

export const MAX_HOLIDAY_DAYS = 31;

const toDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
// 두 날짜 사이 일수 (같은 날 = 1)
export const dayCount = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000) + 1;

// 시작 ~ 끝 날짜 목록 (순서 상관없이 앞 → 뒤)
export function holidayRange(a, b) {
  const [s, e] = a <= b ? [a, b] : [b, a];
  const out = [];
  for (let d = s; d <= e; d = addDays(d, 1)) out.push(d);
  return out;
}

// 연달아 같은 사유인 날 묶기 → [{ start, end, reason, days: [...] }]
export function holidayRuns(list = []) {
  const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
  const runs = [];
  for (const h of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.reason === h.reason && addDays(last.end, 1) === h.date) {
      last.end = h.date;
      last.days.push(h.date);
    } else {
      runs.push({ start: h.date, end: h.date, reason: h.reason, days: [h.date] });
    }
  }
  return runs;
}

// 날짜 → 그 날이 묶음의 어디인지 { run, pos: "single" | "start" | "mid" | "end" }
export function runByDate(runs) {
  const map = {};
  for (const run of runs)
    run.days.forEach((d, i) => {
      const last = run.days.length - 1;
      map[d] = { run, pos: last === 0 ? "single" : i === 0 ? "start" : i === last ? "end" : "mid" };
    });
  return map;
}

// 저장할 때 할 일: 고치기 전 기간(orig)에서 빠진 날은 지우고, 새 기간은 저장
export function savePlan(start, end, origDays = []) {
  const days = holidayRange(start, end);
  const keep = new Set(days);
  return { save: days, remove: origDays.filter((d) => !keep.has(d)) };
}

// "11월 11일 (수) ~ 12일 (목)" (같은 달이면 뒤쪽 월 생략)
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const one = (s, withMonth = true) => {
  const d = toDate(s);
  return `${withMonth ? `${d.getMonth() + 1}월 ` : ""}${d.getDate()}일 (${WD[d.getDay()]})`;
};
export function periodLabel(start, end) {
  if (start === end) return one(start);
  return `${one(start)} ~ ${one(end, start.slice(0, 7) !== end.slice(0, 7))}`;
}
