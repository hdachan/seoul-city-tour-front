// 요청사항 공용 값

export const STATUS = {
  SENT: { label: "안 읽음", className: "is-sent" },
  READ: { label: "확인", className: "is-read" },
  DONE: { label: "완료", className: "is-done" },
};

// "2026-10-28T09:05:12.123" → "10/28 09:05"
export const fmtDateTime = (s) => {
  if (!s) return "";
  const [d, t = ""] = s.split("T");
  const [, m, dd] = d.split("-");
  return `${m}/${dd} ${t.slice(0, 5)}`;
};

export const ROLE_LABEL = { ROLE_SALES: "영업", ROLE_GUIDE: "가이드" };
