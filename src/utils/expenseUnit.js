// 지출 항목별 수량 단위 (가이드 정산 · 가이드 정산관리 공용)
// "북한책" 항목만 인원 대신 권수로 보여줌. 저장은 그대로 headcount 칸 (금액 × 권수 = 합계)
export const isBookExpense = (expenseType) => expenseType === "북한책";

// "명" 또는 "권"
export const expenseUnit = (expenseType) => (isBookExpense(expenseType) ? "권" : "명");

// 입력창 칸 이름
export const expenseAmountLabel = (expenseType) =>
  isBookExpense(expenseType) ? "금액 (1권)" : "금액 (1인)";
export const expenseCountLabel = (expenseType) =>
  isBookExpense(expenseType) ? "권수" : "인원";
