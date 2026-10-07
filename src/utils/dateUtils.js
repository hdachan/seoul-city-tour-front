/**
 * 날짜 → "YYYY-MM-DD" (브라우저 로컬 시간 기준)
 * toISOString()은 UTC 기준이라 한국 시간 00시~09시에 전날로 바뀌므로 사용하지 않음
 */
export function toDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
