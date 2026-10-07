// 운행일지 출발/도착 시간 입력 (영업 정산 · 영업 정산관리 공용)
export default function DrivingTimeFields({ form, setForm }) {
  const timeInput = (key, required) => (
    <input
      type="time"
      value={form[key] || ""}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      required={required}
      style={{
        fontSize: "16px",
        padding: "12px",
        letterSpacing: "1px",
        width: "100%",
        boxSizing: "border-box",
      }}
    />
  );

  const labelStyle = { fontSize: "13px", fontWeight: 700, color: "#1557b0" };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <div className="field" style={{ flex: 1, minWidth: 0 }}>
        <label style={labelStyle}>🚗 출발 시간</label>
        {timeInput("departureTime", false)}
      </div>
      <div className="field" style={{ flex: 1, minWidth: 0 }}>
        <label style={labelStyle}>🕐 도착 시간 *</label>
        {timeInput("arrivalTime", true)}
      </div>
    </div>
  );
}

// 목록 표시용: "09:10 → 09:40" / 도착만 있으면 "09:40"
export const formatDrivingTime = (d) =>
  d.departureTime && d.arrivalTime
    ? `${d.departureTime} → ${d.arrivalTime}`
    : d.arrivalTime || d.departureTime || "";
