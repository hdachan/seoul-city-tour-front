// 인원 · 금액 칸 공용: 음수 · 소수 못 넣게, 마우스휠로 숫자 안 바뀌게
//   <input type="number" {...wholeNumberProps} ... />

// 커서가 있는 숫자 칸은 휠에 값이 바뀜 → 휠만 무시 (커서는 그대로).
// React 의 onWheel 로는 막을 수 없어서(passive) 문서에 한 번만 직접 붙임
if (typeof document !== "undefined") {
  document.addEventListener(
    "wheel",
    (e) => {
      const el = e.target;
      if (el === document.activeElement && el.dataset?.noWheel !== undefined) e.preventDefault();
    },
    { passive: false },
  );
}

export const wholeNumberProps = {
  min: 0,
  step: 1,
  "data-no-wheel": "",
  onKeyDown: (e) => {
    if (["-", "+", "e", "E", "."].includes(e.key)) e.preventDefault();
  },
  onPaste: (e) => {
    if (!/^\d+$/.test(e.clipboardData.getData("text").trim())) e.preventDefault();
  },
};
