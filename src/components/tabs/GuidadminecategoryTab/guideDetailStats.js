// 🔎 가이드 상세 통계 (장부 대조용) 계산 모음 – 화면 없이 테스트 가능
// 금액 기준은 📂 가이드 정산관리 상세 화면 합계 칸과 같음
//  - 현금 / 카드: 투어 금액만 (서버가 준 cashIn / cardIn – 옵션 빼고, 그외-교차는 나눠서, 완불 · 그외는 0)
//  - 옵션 현금 / 카드: 옵션 줄의 cashAmount / cardAmount (장부에도 따로 적음)
//  - 지출: 현금 / 현금이 아닌 것(카드 · 법인카드)
//  - 토탈 = 현금 − 현금 지출

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const num = (v) => Number(v || 0);
const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0);

export const optionCash = (i) => sum(i.options || [], (o) => num(o.cashAmount));
export const optionCard = (i) => sum(i.options || [], (o) => num(o.cardAmount));

// 완불 금액 = 투어 금액만 (옵션은 옵션 칸에 따로라서 뺌)
export const wanbulOf = (i) =>
  i.paymentType === "완불" ? num(i.totalAmount) - sum(i.options || [], (o) => num(o.amount)) : 0;

// "2026-11-07" → "11월 7일 (토)"
export const dateLabel = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
};

// 인원 글자: "어2 아1 유1" (어른만 있으면 "3명")
export const headcountText = (i) => {
  const a = num(i.adult), c = num(i.child), f = num(i.infant);
  if (!c && !f) return `${a || num(i.headcount)}명`;
  return [a && `어${a}`, c && `아${c}`, f && `유${f}`].filter(Boolean).join(" ");
};

// 합계 한 묶음 (대표자 몇 줄 · 하루 · 가이드 · 한 달 공용)
export function totals({ incomes = [], expenses = [], dailyFees = [] }) {
  const cash = sum(incomes, (i) => num(i.cashIn));
  const expCash = sum(expenses.filter((e) => e.paymentType === "현금"), (e) => num(e.totalAmount));
  return {
    count: incomes.length,
    headcount: sum(incomes, (i) => num(i.headcount)),
    cash,
    card: sum(incomes, (i) => num(i.cardIn)),
    optCash: sum(incomes, optionCash),
    optCard: sum(incomes, optionCard),
    wanbul: sum(incomes, wanbulOf),
    expCash,
    expCard: sum(expenses.filter((e) => e.paymentType !== "현금"), (e) => num(e.totalAmount)),
    dailyFee: sum(dailyFees, (d) => num(d.amount)),
    net: cash - expCash, // 정산관리 "토탈"과 같음
  };
}

// 한 가이드 것만
export const onlyGuide = (data, username) => ({
  incomes: (data.incomes || []).filter((r) => r.guideUsername === username),
  expenses: (data.expenses || []).filter((r) => r.guideUsername === username),
  dailyFees: (data.dailyFees || []).filter((r) => r.guideUsername === username),
});

// 하루 것만
export const onlyDate = (part, date) => ({
  incomes: part.incomes.filter((r) => r.date === date),
  expenses: part.expenses.filter((r) => r.date === date),
  dailyFees: part.dailyFees.filter((r) => r.date === date),
});

const datesOf = (part) =>
  [...new Set([...part.incomes, ...part.expenses, ...part.dailyFees].map((r) => r.date))].sort();

// ① 가이드별 한 줄: [{ username, name, days, t }] (가나다순, 기록 없는 가이드도 0으로)
export function guideRows(data) {
  return (data.guides || [])
    .map((g) => {
      const part = onlyGuide(data, g.username);
      return { username: g.username, name: g.name, days: datesOf(part).length, t: totals(part) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

// ② 한 가이드의 날짜별 한 줄: [{ date, t }] (날짜순, 기록 있는 날만)
export const dateRows = (part) => datesOf(part).map((date) => ({ date, t: totals(onlyDate(part, date)) }));

// 그날 옵션을 이름별로 묶음 (🎟 옵션 보기)
//  → [{ name, count, cash, card, rows: [{ no, rep, option }] }]  (이름 가나다순)
//  no = 수입 목록 번호 (넣은 순서) – 💰 수입 보기와 맞춰 볼 수 있게
export function optionGroups(incomes = []) {
  const map = {};
  [...incomes]
    .sort((a, b) => a.id - b.id)
    .forEach((i, idx) =>
      (i.options || []).forEach((o) => {
        const name = o.optionName || "(이름 없음)";
        const g = (map[name] = map[name] || { name, count: 0, cash: 0, card: 0, rows: [] });
        g.count++;
        g.cash += num(o.cashAmount);
        g.card += num(o.cardAmount);
        g.rows.push({ no: idx + 1, rep: i.representativeName || "", option: o });
      }),
    );
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

// 달력 칸: 주마다 7칸 (일~토), 빈칸은 null, 나머지는 "YYYY-MM-DD"
export function calendarWeeks(year, month) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++)
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// 대표자 이름 · 비고 · 옵션 이름 · 지출 항목 검색 (대소문자 무시) → 수입 · 지출 줄
export function search(data, q) {
  const k = (q || "").trim().toLowerCase();
  if (!k) return { incomes: [], expenses: [] };
  const has = (t) => String(t || "").toLowerCase().includes(k);
  return {
    incomes: (data.incomes || []).filter(
      (i) => has(i.representativeName) || has(i.memo) || has(i.note) || (i.options || []).some((o) => has(o.optionName)),
    ),
    expenses: (data.expenses || []).filter((e) => has(e.expenseType) || has(e.memo)),
  };
}

// 미니 달력 칸 색: "income" 수입 있음 / "other" 지출 · 일비만 / "none" 입력 없음 / "future" 아직 안 온 날
export function dayStatus(part, date, today) {
  if (part.incomes.some((r) => r.date === date)) return "income";
  if (part.expenses.some((r) => r.date === date) || part.dailyFees.some((r) => r.date === date)) return "other";
  return today && date > today ? "future" : "none";
}
