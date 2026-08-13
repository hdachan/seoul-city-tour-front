import { useState, useCallback, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ko } from "date-fns/locale";

const SUPABASE_URL = "https://olqxbazcyyorqtkqmjjo.supabase.co";
const SUPABASE_KEY = "sb_publishable_FlvMFCwWYsR7ysJgllgTgA_NWRmqW5S";
const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatTime(t) {
  return `${t.slice(0, 2)}:${t.slice(2)}`;
}

function calcStats(schedules) {
  const counts = {};
  for (const s of schedules) {
    counts[s.group] = (counts[s.group] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function formatUpdatedAt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return format(d, "M월 d일 HH:mm", { locale: ko }) + " 기준";
}

async function fetchMonthSavedDates(yearMonth) {
  const from = `${yearMonth}-01`;
  const to = `${yearMonth}-31`;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?date=gte.${from}&date=lte.${to}&select=date,schedules`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  const data = await res.json();
  if (!Array.isArray(data)) return new Set();
  return new Set(
    data
      .filter((row) => {
        if (!row.schedules) return false;
        if (Array.isArray(row.schedules)) return row.schedules.length > 0;
        if (typeof row.schedules === "string")
          return row.schedules !== "[]" && row.schedules !== "";
        return true;
      })
      .map((row) => row.date),
  );
}

async function fetchDateDetail(dateStr) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?date=eq.${dateStr}&select=schedules,updated_at`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0)
    return { schedules: [], updated_at: "" };
  const raw = data[0].schedules;
  return {
    schedules: raw.map((item) => ({
      time: item.turn_time,
      group: item.group_name,
    })),
    updated_at: data[0].updated_at ?? "",
  };
}

export default function DmzContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [savedDatesCache, setSavedDatesCache] = useState({});
  const [savedDates, setSavedDates] = useState(new Set());

  useEffect(() => {
    const yearMonth = format(currentMonth, "yyyy-MM");
    if (savedDatesCache[yearMonth]) {
      setSavedDates(savedDatesCache[yearMonth]);
      return;
    }
    fetchMonthSavedDates(yearMonth).then((dates) => {
      setSavedDates(dates);
      setSavedDatesCache((prev) => ({ ...prev, [yearMonth]: dates }));
    });
  }, [currentMonth]);

  const handleDateClick = useCallback(
    async (date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      if (!savedDates.has(dateStr)) return;
      setSelectedDate(date);
      setError(null);
      if (detailCache[dateStr]) {
        setSchedules(detailCache[dateStr].schedules);
        setUpdatedAt(detailCache[dateStr].updated_at);
        return;
      }
      setLoading(true);
      setSchedules([]);
      setUpdatedAt("");
      try {
        const result = await fetchDateDetail(dateStr);
        setSchedules(result.schedules);
        setUpdatedAt(result.updated_at);
        setDetailCache((prev) => ({ ...prev, [dateStr]: result }));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [savedDates, detailCache],
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks = [];
  let day = calStart;
  while (day <= calEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const stats = calcStats(schedules);
  const timeGroups = {};
  for (const s of schedules) {
    if (!timeGroups[s.time]) timeGroups[s.time] = [];
    timeGroups[s.time].push(s.group);
  }

  return (
    <div style={{ width: "100%", fontFamily: "맑은 고딕, sans-serif" }}>
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#1a1a2e",
            margin: 0,
          }}
        >
          📅 DMZ 예약 정보
        </h2>
        {selectedDate && (
          <>
            <span style={{ color: "#ccc" }}>›</span>
            <button
              onClick={() => {
                setSelectedDate(null);
                setSchedules([]);
                setUpdatedAt("");
              }}
              style={{
                background: "none",
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#555",
              }}
            >
              달력
            </button>
            <span style={{ color: "#ccc" }}>›</span>
            <span
              style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}
            >
              {format(selectedDate, "M월 d일 (EEEE)", { locale: ko })}
            </span>
            {updatedAt && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#aaa",
                  background: "#f8f9fb",
                  padding: "3px 8px",
                  borderRadius: "99px",
                  border: "1px solid #e8eaed",
                }}
              >
                🕐 {formatUpdatedAt(updatedAt)}
              </span>
            )}
          </>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* 달력 */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e8eaed",
            overflow: "hidden",
          }}
        >
          {/* 월 네비 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid #f0f2f5",
            }}
          >
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#555",
                padding: "2px 8px",
              }}
            >
              ‹
            </button>
            <span
              style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e" }}
            >
              {format(currentMonth, "yyyy년 M월", { locale: ko })}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              style={{
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#555",
                padding: "2px 8px",
              }}
            >
              ›
            </button>
          </div>

          {/* 요일 헤더 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              padding: "8px 10px 4px",
            }}
          >
            {WEEK_DAYS.map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 0",
                  color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#9ca3af",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div style={{ padding: "0 10px 12px" }}>
            {weeks.map((week, wi) => (
              <div
                key={wi}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "2px",
                  marginBottom: "2px",
                }}
              >
                {week.map((date, di) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const hasSaved = savedDates.has(dateStr);
                  const isSel = selectedDate
                    ? isSameDay(date, selectedDate)
                    : false;
                  const isTod = isToday(date);
                  const isThisMon = isSameMonth(date, currentMonth);
                  const isSun = di === 0;
                  const isSat = di === 6;
                  return (
                    <div
                      key={di}
                      onClick={() => hasSaved && handleDateClick(date)}
                      style={{
                        cursor: hasSaved ? "pointer" : "default",
                        borderRadius: "8px",
                        padding: "6px 2px",
                        background: isSel
                          ? "#1557b0"
                          : isTod
                            ? "#eff6ff"
                            : "transparent",
                        border:
                          isTod && !isSel
                            ? "1px solid #bae6fd"
                            : "1px solid transparent",
                        opacity: !isThisMon ? 0.3 : !hasSaved ? 0.4 : 1,
                        textAlign: "center",
                        transition: "all 0.1s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: isTod ? 700 : 400,
                          color: isSel
                            ? "#fff"
                            : !isThisMon
                              ? "#d1d5db"
                              : isTod
                                ? "#1557b0"
                                : isSun
                                  ? "#dc2626"
                                  : isSat
                                    ? "#2563eb"
                                    : "#374151",
                        }}
                      >
                        {format(date, "d")}
                      </div>
                      {hasSaved && (
                        <div
                          style={{
                            width: "4px",
                            height: "4px",
                            borderRadius: "50%",
                            margin: "2px auto 0",
                            background: isSel ? "#fff" : "#3b82f6",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 범례 */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #f0f2f5",
              display: "flex",
              gap: "12px",
              fontSize: "11px",
              color: "#aaa",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                  display: "inline-block",
                }}
              />
              데이터 있음
            </span>
            <span>흐린 날짜 = 데이터 없음</span>
          </div>
        </div>

        {/* 상세 */}
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e8eaed",
            minHeight: "400px",
          }}
        >
          {!selectedDate ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "400px",
                color: "#bbb",
                fontSize: "13px",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "32px" }}>📅</span>
              점(●)이 있는 날짜를 클릭하면 일정이 표시돼요
            </div>
          ) : loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "400px",
                color: "#aaa",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "24px" }}>⏳</span>
              불러오는 중...
            </div>
          ) : error ? (
            <div style={{ padding: "24px", color: "#dc2626" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px" }}>
                ❌ 오류 발생
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#888",
                  fontFamily: "monospace",
                }}
              >
                {error}
              </div>
            </div>
          ) : (
            <div>
              {/* 상세 헤더 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "16px 20px",
                  borderBottom: "1px solid #f0f2f5",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#1a1a2e",
                  }}
                >
                  {format(selectedDate, "M월 d일", { locale: ko })}
                </span>
                <span style={{ fontSize: "13px", color: "#888" }}>
                  {format(selectedDate, "EEEE", { locale: ko })}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "12px",
                    color: "#aaa",
                  }}
                >
                  총 {schedules.length}건
                </span>
              </div>

              {schedules.length === 0 ? (
                <div
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "#d1d5db",
                    fontSize: "13px",
                  }}
                >
                  데이터가 없습니다.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0",
                    padding: "0",
                  }}
                >
                  {/* 시간별 일정 */}
                  <div
                    style={{
                      padding: "16px 20px",
                      borderRight: "1px solid #f0f2f5",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#aaa",
                        marginBottom: "12px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      시간별 일정
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1px",
                      }}
                    >
                      {Object.entries(timeGroups)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([time, groups]) => (
                          <div
                            key={time}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "12px",
                              padding: "6px 0",
                              borderBottom: "1px solid #f8f9fb",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#1557b0",
                                minWidth: "48px",
                              }}
                            >
                              {formatTime(time)}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              {groups.map((g, i) => (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: "13px",
                                    color: g === "." ? "#d1d5db" : "#1a1a2e",
                                  }}
                                >
                                  {g}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* 단체 통계 */}
                  <div style={{ padding: "16px 20px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#aaa",
                        marginBottom: "12px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      단체 통계
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {stats.map(([group, count]) => (
                        <div
                          key={group}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 10px",
                            background: "#f8f9fb",
                            borderRadius: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              color: group === "." ? "#d1d5db" : "#374151",
                            }}
                          >
                            {group}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#1557b0",
                              background: "#e8f0fe",
                              padding: "2px 8px",
                              borderRadius: "99px",
                            }}
                          >
                            {count}회
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
