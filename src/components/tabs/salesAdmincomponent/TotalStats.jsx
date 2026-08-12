import * as XLSX from "xlsx";

export default function TotalStats({
  summary,
  year,
  month,
  years,
  months,
  onYearChange,
  onMonthChange,
  onUserClick,
}) {
  const fmt = (n) => Number(n || 0).toLocaleString();
  const fmtWon = (n) => fmt(n) + "원";
  const pad2 = (n) => String(n).padStart(2, "0");

  const now = new Date();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayDay = isCurrentMonth ? now.getDate() : daysInMonth;
  const today = now.toISOString().split("T")[0];

  const allDays = Array.from(
    { length: todayDay },
    (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`,
  );
  const firstDow = new Date(year, month - 1, 1).getDay();
  const calOffset = firstDow === 0 ? 6 : firstDow - 1;

  const totalDist = summary.reduce((s, u) => s + (u.totalDist || 0), 0);
  const totalFuelL = summary.reduce((s, u) => s + (u.totalFuelL || 0), 0);
  const totalFuelC = summary.reduce((s, u) => s + (u.totalFuelC || 0), 0);
  const avgKmL = totalFuelL > 0 ? (totalDist / totalFuelL).toFixed(1) : "-";

  // 엑셀 다운로드
  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const title = [[`${month}월 주행 거리 및 주유 내역`, "", "", "", ""]];
    const header = [
      [
        "성명",
        `${month}월 운행 내역(km)`,
        "총 주유 내역(L)",
        "평균거리(km/L)",
        "총 주유 금액",
      ],
    ];
    const rows = summary.map((u) => {
      const avg =
        u.totalFuelL > 0 ? (u.totalDist / u.totalFuelL).toFixed(1) : "";
      return [
        u.name,
        u.totalDist > 0 ? u.totalDist : "",
        u.totalFuelL > 0 ? u.totalFuelL.toFixed(2) : "",
        avg,
        u.totalFuelC > 0 ? u.totalFuelC : "",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([...title, ...header, ...rows]);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    // 헤더 행(1번) 회색 배경
    const headerCols = ["A", "B", "C", "D", "E"];
    headerCols.forEach((col) => {
      const cell = ws[col + "2"];
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: "D9D9D9" } },
          font: { bold: true },
          alignment: { horizontal: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        };
      }
    });

    ws["!pageSetup"] = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    XLSX.utils.book_append_sheet(wb, ws, `${month}월 주행거리`);
    XLSX.writeFile(wb, `${year}년_${month}월_주행거리및주유내역.xlsx`);
  };

  // 인쇄
  const printReport = () => {
    const rows = summary
      .map((u) => {
        const avg =
          u.totalFuelL > 0
            ? (u.totalDist / u.totalFuelL).toFixed(1) + "km"
            : "";
        return `<tr>
        <td>${u.name}</td>
        <td>${u.totalDist > 0 ? fmt(u.totalDist) + "km" : ""}</td>
        <td>${u.totalFuelL > 0 ? u.totalFuelL.toFixed(0) + " ℓ" : ""}</td>
        <td>${avg}</td>
        <td>${u.totalFuelC > 0 ? fmt(u.totalFuelC) : ""}</td>
      </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: '맑은 고딕', sans-serif; padding: 15mm 20mm; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
      h2 { font-size: 20pt; font-weight: bold; letter-spacing: 2px; }
      .approval { border-collapse: collapse; font-size: 10pt; }
      .approval td { border: 1px solid #000; width: 60px; height: 50px; text-align: center; vertical-align: top; padding: 4px; }
      table.main { width: 100%; border-collapse: collapse; font-size: 11pt; margin-top: 10px; }
      table.main th { border: 1px solid #000; padding: 10px 8px; text-align: center; font-weight: bold; background: #f8f8f8; }
      table.main td { border: 1px solid #000; padding: 10px 8px; text-align: center; height: 40px; }
      @media print { @page { size: A4 landscape; margin: 10mm 15mm; } }
    </style></head><body>
    <div class="top">
      <h2>${month}월 주행 거리 및 주유 내역</h2>
      <table class="approval">
        <tr><td>부사장</td><td>대표이사</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
      </table>
    </div>
    <table class="main">
      <thead><tr>
        <th>성 명</th>
        <th>${month}월 운행 내역(km)</th>
        <th>총 주유 내역</th>
        <th>평균거리(km/L)</th>
        <th>총 주유 금액</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload=()=>{window.print();window.close();}</script>
    </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 필터 + 버튼 */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
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
          {isCurrentMonth ? `${todayDay}일 경과` : `총 ${daysInMonth}일`}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button
            onClick={downloadExcel}
            className="btn-outline"
            style={{ fontSize: "12px", padding: "7px 12px" }}
          >
            📥 엑셀
          </button>
          <button
            onClick={printReport}
            className="btn-outline"
            style={{ fontSize: "12px", padding: "7px 12px" }}
          >
            🖨 인쇄
          </button>
        </div>
      </div>

      {/* ① 합산 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}
      >
        {[
          {
            label: "총 운행거리",
            value: `${fmt(totalDist)}km`,
            color: "#1557b0",
            bg: "#eff6ff",
            icon: "🚗",
          },
          {
            label: "총 주유량",
            value: `${totalFuelL.toFixed(1)}L`,
            color: "#92400e",
            bg: "#fffbeb",
            icon: "⛽",
          },
          {
            label: "평균 연비",
            value: `${avgKmL}km/L`,
            color: "#059669",
            bg: "#f0fdf4",
            icon: "📊",
          },
          {
            label: "총 주유금액",
            value: fmtWon(totalFuelC),
            color: "#7c3aed",
            bg: "#faf5ff",
            icon: "💳",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: s.bg,
              borderRadius: "12px",
              padding: "16px 18px",
              border: `1px solid ${s.color}22`,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: s.color,
                marginBottom: "6px",
                fontWeight: 600,
                opacity: 0.8,
              }}
            >
              {s.icon} {s.label}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ② 입력 현황 - 잔디만 */}
      <div>
        <p
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: "10px",
          }}
        >
          📋 입력 현황
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "12px",
          }}
        >
          {summary.map((u) => {
            const enteredSet = new Set(u.enteredDates || []);
            const missingDays = allDays.filter((d) => !enteredSet.has(d));
            const allGood = missingDays.length === 0;

            return (
              <div
                key={u.username}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: `1.5px solid ${allGood ? "#86efac" : "#fed7aa"}`,
                  padding: "14px 16px",
                }}
              >
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
                      fontWeight: 700,
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{allGood ? "✅" : "⚠️"}</span>
                    <span>{u.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "#1557b0",
                      }}
                    >
                      {fmt(u.totalDist || 0)}km
                    </div>
                    {u.totalFuelC > 0 && (
                      <div style={{ fontSize: "11px", color: "#7c3aed" }}>
                        {fmtWon(u.totalFuelC)}
                      </div>
                    )}
                  </div>
                </div>
                {/* 잔디 달력 */}
                <div style={{ overflowX: "auto" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 16px)",
                      gap: "2px",
                      marginBottom: "2px",
                    }}
                  >
                    {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                      <div
                        key={d}
                        style={{
                          fontSize: "8px",
                          color: "#bbb",
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 16px)",
                      gap: "2px",
                    }}
                  >
                    {Array.from({ length: calOffset }).map((_, i) => (
                      <div
                        key={`off-${i}`}
                        style={{ width: "16px", height: "16px" }}
                      />
                    ))}
                    {allDays.map((dateStr) => {
                      const day = parseInt(dateStr.split("-")[2]);
                      const hasEntry = enteredSet.has(dateStr);
                      const isToday = dateStr === today;
                      return (
                        <div
                          key={dateStr}
                          title={`${month}/${day}${hasEntry ? " ✓" : " 미입력"}`}
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "3px",
                            background: hasEntry ? "#22c55e" : "#fee2e2",
                            outline: isToday ? "2px solid #1557b0" : "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "7px",
                              color: hasEntry ? "#fff" : "#dc2626",
                              fontWeight: 700,
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
            );
          })}
        </div>
      </div>

      {/* ③ 사람별 통계 표 */}
      <div>
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
            borderRadius: "12px",
            border: "1px solid #e8eaed",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8f9fb",
                  borderBottom: "1px solid #e8eaed",
                }}
              >
                {[
                  "이름",
                  `${month}월 운행거리`,
                  "총 주유량",
                  "평균 연비",
                  "총 주유금액",
                ].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 14px",
                      textAlign: i === 0 ? "left" : "right",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#888",
                    }}
                  >
                    {h}
                  </th>
                ))}
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
                  const avg =
                    u.totalFuelL > 0
                      ? (u.totalDist / u.totalFuelL).toFixed(1) + "km/L"
                      : "-";
                  return (
                    <tr
                      key={u.username}
                      style={{ borderBottom: "1px solid #f0f2f5" }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          onClick={() => onUserClick && onUserClick(u)}
                          style={{
                            fontWeight: 700,
                            color: onUserClick ? "#1557b0" : "#1a1a2e",
                            cursor: onUserClick ? "pointer" : "default",
                            textDecoration: onUserClick ? "underline" : "none",
                            textUnderlineOffset: "3px",
                          }}
                        >
                          {u.name}
                        </span>
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
                          color: "#059669",
                        }}
                      >
                        {avg}
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
                    color: "#059669",
                  }}
                >
                  {avgKmL}km/L
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
          </table>
        </div>
      </div>
    </div>
  );
}
