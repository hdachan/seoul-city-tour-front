import { useState } from "react";

export default function TotalStats({
  summary,
  year,
  month,
  years,
  months,
  onYearChange,
  onMonthChange,
}) {
  const fmt = (n) => Number(n || 0).toLocaleString();
  const fmtWon = (n) => fmt(n) + "원";
  const pad2 = (n) => String(n).padStart(2, "0");

  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayDay = isCurrentMonth ? now.getDate() : daysInMonth;

  // 날짜 배열 생성 (1일~todayDay)
  const allDays = Array.from({ length: todayDay }, (_, i) => {
    const d = i + 1;
    return `${year}-${pad2(month)}-${pad2(d)}`;
  });

  // 달력 그리드용 (월요일 시작)
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=일
  const calOffset = firstDow === 0 ? 6 : firstDow - 1; // 월요일 기준 오프셋

  const totalDist = summary.reduce((s, u) => s + (u.totalDist || 0), 0);
  const totalFuelL = summary.reduce((s, u) => s + (u.totalFuelL || 0), 0);
  const totalFuelC = summary.reduce((s, u) => s + (u.totalFuelC || 0), 0);
  const avgKmL = totalFuelL > 0 ? (totalDist / totalFuelL).toFixed(1) : "-";

  const missingUsers = summary.filter((u) => {
    const enteredSet = new Set(u.enteredDates || []);
    return allDays.some((d) => !enteredSet.has(d));
  });

  return (
    <div>
      {/* 필터 */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          style={{
            padding: "7px 12px",
            border: "1.5px solid #d8dce3",
            borderRadius: "7px",
            fontSize: "13px",
            outline: "none",
            background: "#fff",
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          style={{
            padding: "7px 12px",
            border: "1.5px solid #d8dce3",
            borderRadius: "7px",
            fontSize: "13px",
            outline: "none",
            background: "#fff",
          }}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
        <span style={{ fontSize: "12px", color: "#888" }}>
          {isCurrentMonth
            ? `오늘까지 ${todayDay}일 경과`
            : `총 ${daysInMonth}일`}
        </span>
      </div>

      {/* ① 미입력 현황 - 잔디 방식 */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "18px" }}>
            {missingUsers.length > 0 ? "⚠️" : "✅"}
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: missingUsers.length > 0 ? "#c2410c" : "#15803d",
            }}
          >
            {missingUsers.length > 0
              ? `${missingUsers.length}명이 미입력 날짜가 있습니다`
              : "모든 직원이 정상 입력 중입니다"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {summary.map((u) => {
            const enteredSet = new Set(u.enteredDates || []);
            const missingDays = allDays.filter((d) => !enteredSet.has(d));
            const allGood = missingDays.length === 0;

            return (
              <div
                key={u.username}
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: `1px solid ${allGood ? "#e8eaed" : "#fed7aa"}`,
                  padding: "12px 14px",
                }}
              >
                {/* 헤더 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>
                      {allGood ? "✅" : "⚠️"}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>
                      {u.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: allGood ? "#15803d" : "#dc2626",
                    }}
                  >
                    {enteredSet.size}일 입력
                    {!allGood && ` / ${missingDays.length}일 미입력`}
                  </span>
                </div>

                {/* 잔디 달력 */}
                <div style={{ overflowX: "auto" }}>
                  <div
                    style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}
                  >
                    {/* 요일 헤더 */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 18px)",
                        gap: "2px",
                        marginBottom: "2px",
                        width: "100%",
                      }}
                    >
                      {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                        <div
                          key={d}
                          style={{
                            fontSize: "9px",
                            color: "#aaa",
                            textAlign: "center",
                            fontWeight: 600,
                          }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* 달력 그리드 */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 18px)",
                        gap: "2px",
                      }}
                    >
                      {/* 오프셋 빈칸 */}
                      {Array.from({ length: calOffset }).map((_, i) => (
                        <div
                          key={`off-${i}`}
                          style={{ width: "18px", height: "18px" }}
                        />
                      ))}
                      {/* 날짜 칸 */}
                      {allDays.map((dateStr) => {
                        const day = parseInt(dateStr.split("-")[2]);
                        const hasEntry = enteredSet.has(dateStr);
                        const isToday =
                          dateStr === now.toISOString().split("T")[0];
                        return (
                          <div
                            key={dateStr}
                            title={`${month}/${day}${hasEntry ? " ✓" : " 미입력"}`}
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "3px",
                              cursor: "default",
                              background: hasEntry ? "#22c55e" : "#fee2e2",
                              border: isToday ? "2px solid #1557b0" : "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "8px",
                                color: hasEntry ? "#fff" : "#dc2626",
                                fontWeight: 600,
                              }}
                            >
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ② 전체 합산 */}
      <p
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: "10px",
        }}
      >
        📊 {year}년 {month}월 전체 합산
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {[
          {
            label: "총 운행거리",
            value: `${fmt(totalDist)}km`,
            color: "#1557b0",
          },
          {
            label: "총 주유량",
            value: `${totalFuelL.toFixed(2)}L`,
            color: "#92400e",
          },
          { label: "평균 연비", value: `${avgKmL}km/L`, color: "#059669" },
          { label: "총 주유금액", value: fmtWon(totalFuelC), color: "#7c3aed" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              borderRadius: "10px",
              border: "1px solid #e8eaed",
              padding: "14px 16px",
              borderLeft: `4px solid ${s.color}`,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#888",
                marginBottom: "4px",
                fontWeight: 600,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ③ 사람별 통계 */}
      <p
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: "10px",
        }}
      >
        👤 사람별 통계
      </p>
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          border: "1px solid #e8eaed",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
            minWidth: "500px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8f9fb",
                borderBottom: "1px solid #e8eaed",
              }}
            >
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#888",
                }}
              >
                이름
              </th>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#888",
                }}
              >
                입력 현황
              </th>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#888",
                }}
              >
                운행거리
              </th>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#888",
                }}
              >
                주유량
              </th>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#888",
                }}
              >
                주유금액
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "2.5rem",
                    color: "#bbb",
                  }}
                >
                  데이터 없음
                </td>
              </tr>
            ) : (
              summary.map((u) => {
                const entered = u.enteredDays ?? u.drivingCount ?? 0;
                const missing = Math.max(0, todayDay - entered);
                const allGood = missing === 0;
                return (
                  <tr
                    key={u.username}
                    style={{ borderBottom: "1px solid #f0f2f5" }}
                  >
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                      {u.name}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: allGood ? "#15803d" : "#dc2626",
                        }}
                      >
                        {entered}/{todayDay}일
                      </span>
                      {!allGood && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#dc2626",
                            marginLeft: "4px",
                          }}
                        >
                          ({missing}일 미입력)
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#1557b0",
                      }}
                    >
                      {u.totalDist > 0 ? `${fmt(u.totalDist)}km` : "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        color: "#92400e",
                      }}
                    >
                      {u.totalFuelL > 0 ? `${u.totalFuelL.toFixed(2)}L` : "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        color: "#7c3aed",
                      }}
                    >
                      {u.totalFuelC > 0 ? fmtWon(u.totalFuelC) : "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {summary.length > 0 && (
            <tfoot>
              <tr
                style={{
                  background: "#f0f4ff",
                  borderTop: "2px solid #e8eaed",
                }}
              >
                <td
                  style={{
                    padding: "10px 14px",
                    fontWeight: 700,
                    color: "#1557b0",
                  }}
                >
                  합계
                </td>
                <td></td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#1557b0",
                  }}
                >
                  {fmt(totalDist)}km
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#92400e",
                  }}
                >
                  {totalFuelL.toFixed(2)}L
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#7c3aed",
                  }}
                >
                  {fmtWon(totalFuelC)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
