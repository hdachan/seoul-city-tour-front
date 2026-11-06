// 📊 가이드 정산 통계 맨 아래: 옵션별 통계 (그 달 전체 합)
// 기타에 직접 적은 옵션은 "기타" 한 줄로 묶고, 누르면 적은 이름이 펼쳐짐
import { useState } from "react";

const fmt = (n) => `${Number(n || 0).toLocaleString()}원`;
const cell = { padding: "11px 14px", textAlign: "right" };
const head = {
  padding: "11px 14px",
  textAlign: "right",
  fontSize: "11px",
  color: "#6b7280",
  fontWeight: 700,
  background: "#f9fafb",
  borderBottom: "2px solid #e5e7eb",
};

const Cells = ({ r }) => (
  <>
    <td style={cell}>{r.count}건</td>
    <td style={cell}>{fmt(r.cash)}</td>
    <td style={cell}>{fmt(r.card)}</td>
    <td style={{ ...cell, fontWeight: 600, color: "#059669" }}>{fmt(r.total)}</td>
  </>
);

export default function OptionStatsTable({ rows = [] }) {
  const [open, setOpen] = useState(false);
  const sum = (key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

  return (
    <div style={{ marginTop: "24px" }}>
      <h3
        style={{
          fontSize: "15px",
          fontWeight: 700,
          color: "#111827",
          marginBottom: "12px",
          paddingLeft: "10px",
          borderLeft: "3px solid #059669",
        }}
      >
        🎟️ 옵션별 통계
      </h3>
      {rows.length === 0 ? (
        <div style={{ padding: "16px", color: "#9ca3af", fontSize: "13px", textAlign: "center" }}>
          이번 달 옵션 기록이 없어요.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: "left" }}>옵션</th>
                <th style={head}>건수</th>
                <th style={head}>현금</th>
                <th style={head}>카드</th>
                <th style={head}>합계</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const details = r.details || [];
                return [
                  <tr key={r.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 600 }}>
                      {details.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setOpen((v) => !v)}
                          aria-expanded={open}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600, fontSize: "13px", color: "#1557b0" }}
                        >
                          {open ? "▼" : "▶"} {r.name}
                        </button>
                      ) : (
                        r.name
                      )}
                    </td>
                    <Cells r={r} />
                  </tr>,
                  ...(open
                    ? details.map((d) => (
                        <tr key={`${r.name}-${d.name}`} style={{ borderBottom: "1px solid #f3f4f6", background: "#f9fafb", color: "#555" }}>
                          <td style={{ padding: "9px 14px 9px 30px", fontSize: "12px" }}>└ {d.name}</td>
                          <Cells r={d} />
                        </tr>
                      ))
                    : []),
                ];
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #e5e7eb", background: "#f9fafb", fontWeight: 700 }}>
                <td style={{ padding: "11px 14px" }}>합계</td>
                <td style={cell}>{sum("count")}건</td>
                <td style={cell}>{fmt(sum("cash"))}</td>
                <td style={cell}>{fmt(sum("card"))}</td>
                <td style={{ ...cell, color: "#059669" }}>{fmt(sum("total"))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
