// 프라이빗투어: 금액 = 총액 (인원을 곱하지 않음), 인원은 한 칸 (어른/아이/유아 구분 없음)
//   DB 칸은 그대로 - 금액은 amount, 인원은 adult 에 저장 (서버 GuideIncomeCalc 와 같은 규칙)
export const isPrivateTour = (name) => (name || "").includes("프라이빗");
