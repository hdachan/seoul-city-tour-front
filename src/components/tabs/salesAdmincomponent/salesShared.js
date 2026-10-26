// 영업 정산 · 영업 정산관리 공용 기능

export const fmt = (n) => Number(n || 0).toLocaleString();
export const fmtWon = (n) => fmt(n) + "원";
export const pad2 = (n) => String(n).padStart(2, "0");

// 구분별 거리 합계 (type 없으면 전체)
export const sumDist = (list, key, type) =>
  list
    .filter((d) => !type || d.type === type)
    .reduce((s, d) => s + (d[key] || 0), 0);

// 지금 한국 시각 "HH:MM" (운행일지 출발/도착 시간 기본값)
export const getKoreaTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

export const TYPES = ["업무", "주유", "개인주유", "개인사용"];
export const TYPE_STYLE = {
  업무: { bg: "#e8f0fe", color: "#1557b0" },
  주유: { bg: "#fef3c7", color: "#92400e" },
  개인주유: { bg: "#fce7f3", color: "#9d174d" },
  개인사용: { bg: "#ede9fe", color: "#6d28d9" },
};

// 월요일 기준 주 계산 (한국 달력 월~일, 이번 달 범위로 자름)
export const getWeeksOfMonth = (year, month) => {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let start = new Date(firstDay);
  const dow = start.getDay(); // 0=일, 1=월
  if (dow !== 1) {
    start.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));
  }
  let weekNum = 1;
  while (start <= lastDay) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const cs = start < firstDay ? new Date(firstDay) : new Date(start);
    const ce = end > lastDay ? new Date(lastDay) : new Date(end);
    weeks.push({
      weekNum,
      start: cs,
      end: ce,
      startStr: `${year}-${pad2(cs.getMonth() + 1)}-${pad2(cs.getDate())}`,
      endStr: `${year}-${pad2(ce.getMonth() + 1)}-${pad2(ce.getDate())}`,
      label: `${cs.getDate()}일~${ce.getDate()}일`,
    });
    start.setDate(start.getDate() + 7);
    weekNum++;
  }
  return weeks;
};

// 미터기 기준 운행거리 계산 → { [기록 id]: 거리 }
// 시간이 없는 기록(개인사용 등)도 순서가 맞도록 날짜 → 미터기 순으로 계산
// 구간 거리는 뒤쪽 기록의 구분(업무/개인사용)에 붙음
export const calcDistances = (list, startMeter = 0) => {
  const sorted = list
    .filter((d) => d.meterReading > 0)
    .sort((a, b) =>
      a.date === b.date
        ? a.meterReading - b.meterReading
        : a.date.localeCompare(b.date),
    );
  let last = startMeter || 0;
  const map = {};
  sorted.forEach((d) => {
    map[d.id] = last > 0 && d.meterReading > last ? d.meterReading - last : 0;
    last = Math.max(last, d.meterReading);
  });
  return map;
};

