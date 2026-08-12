import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  fetchPlatforms,
  addPlatform,
  removePlatform,
  fetchMonthlySettlement,
  saveSettlement,
  fetchYearlySettlement,
} from "../../api/auth";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const updatePlatform = (id, data) =>
  axios.put(`${BASE_URL}/settlement/platforms/${id}`, data, authHeader());

const PIE_COLORS = [
  "#1d4ed8",
  "#059669",
  "#e53e3e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#14b8a6",
];

export default function SettlementContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [subTab, setSubTab] = useState("monthly");

  const [platforms, setPlatforms] = useState([]);
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [yearlyData, setYearlyData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({ name: "", region: "국내" });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const loadPlatforms = async () => {
    const r = await fetchPlatforms();
    setPlatforms(r.data);
  };
  const loadMonthly = async () => {
    const r = await fetchMonthlySettlement(year, month);
    setRows(r.data);
    setEditingId(null);
  };
  const loadYearly = async () => {
    const r = await fetchYearlySettlement(year);
    setYearlyData(r.data);
  };

  useEffect(() => {
    loadPlatforms();
  }, []);
  useEffect(() => {
    loadMonthly();
  }, [year, month]);
  useEffect(() => {
    if (subTab === "stats") loadYearly();
  }, [subTab, year]);

  const startEdit = (row) => {
    setEditingId(row.platformId);
    setEditValues({ amount: row.amount || "", memo: row.memo || "" });
  };
  const handleSave = async (row) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await saveSettlement(
        row.platformId,
        year,
        month,
        editValues.amount,
        editValues.memo,
      );
      setSuccess(`${row.name} 저장 완료!`);
      setEditingId(null);
      loadMonthly();
    } catch (err) {
      setError(err.response?.data?.error || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setFormData({ name: "", region: "국내" });
    setEditTarget(null);
    setShowModal(true);
  };
  const openEdit = (p) => {
    setFormData({ name: p.name, region: p.region || "국내" });
    setEditTarget(p);
    setShowModal(true);
  };
  const handleSubmitPlatform = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editTarget) {
        await updatePlatform(editTarget.id, formData);
        setSuccess("수정되었습니다.");
      } else {
        await addPlatform(formData.name, formData.region, "");
        setSuccess("추가되었습니다.");
      }
      setShowModal(false);
      loadPlatforms();
      loadMonthly();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeletePlatform = async (id, name) => {
    if (!window.confirm(`${name}을(를) 삭제할까요?`)) return;
    try {
      await removePlatform(id);
      setSuccess("삭제되었습니다.");
      loadPlatforms();
      loadMonthly();
    } catch {
      setError("삭제 실패");
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString() + "원";
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const regionBadge = (region) =>
    region === "해외"
      ? { background: "#dbeafe", color: "#1e40af" }
      : { background: "#d1fae5", color: "#065f46" };

  // 통계 - 월별 × 업체별 스택 데이터
  const platformNames = platforms.map((p) => p.name);
  const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const obj = { month: `${m}월` };
    platformNames.forEach((name) => {
      const found = yearlyData.find((d) => d.month === m && d.name === name);
      obj[name] = found ? found.amount || 0 : 0;
    });
    return obj;
  });

  const platformTotals = platforms
    .map((p, i) => ({
      name: p.name,
      region: p.region,
      value: yearlyData
        .filter((d) => d.name === p.name)
        .reduce((s, d) => s + (d.amount || 0), 0),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .filter((p) => p.value > 0);
  const grandTotal = platformTotals.reduce((s, p) => s + p.value, 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + p.value, 0);
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "6px", color: "#1a1a1a" }}>
          {label}
        </p>
        {payload
          .filter((p) => p.value > 0)
          .map((p) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "2px",
              }}
            >
              <span style={{ color: p.fill }}>■ {p.name}</span>
              <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
            </div>
          ))}
        {payload.length > 1 && (
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              marginTop: "6px",
              paddingTop: "6px",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            <span>합계</span>
            <span>{fmt(total)}</span>
          </div>
        )}
      </div>
    );
  };

  const subTabs = [
    { id: "monthly", label: "💰 월별 정산" },
    { id: "manage", label: "⚙️ 업체 관리" },
    { id: "stats", label: "📊 통계" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        width: "100%",
        minHeight: "500px",
      }}
    >
      {/* 사이드바 */}
      <div style={{ width: "160px", flexShrink: 0 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}
        >
          {subTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              style={{
                width: "100%",
                padding: "13px 16px",
                border: "none",
                textAlign: "left",
                fontSize: "13px",
                fontWeight: subTab === t.id ? 600 : 400,
                cursor: "pointer",
                background: subTab === t.id ? "#eff6ff" : "#fff",
                color: subTab === t.id ? "#1d4ed8" : "#555",
                borderLeft:
                  subTab === t.id
                    ? "3px solid #1d4ed8"
                    : "3px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {error && (
          <div className="alert alert-error" onClick={() => setError("")}>
            ⚠ {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" onClick={() => setSuccess("")}>
            ✅ {success}
          </div>
        )}

        {/* 월별 정산 */}
        {subTab === "monthly" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1rem",
                background: "#fff",
                padding: "12px 16px",
                borderRadius: "12px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={selStyle}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={selStyle}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "12px", color: "#888" }}>
                {rows.filter((r) => r.hasData).length}/{rows.length}개 입력됨
              </span>
            </div>
            {totalAmount > 0 && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  marginBottom: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "#1e40af",
                    fontWeight: 500,
                  }}
                >
                  {year}년 {month}월 합계
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#1d4ed8",
                  }}
                >
                  {fmt(totalAmount)}
                </span>
              </div>
            )}
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
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
                      background: "#fafafa",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <th style={thStyle}>업체명</th>
                    <th style={thStyle}>지역</th>
                    <th style={{ ...thStyle, width: "180px" }}>금액</th>
                    <th style={thStyle}>비고</th>
                    <th style={{ ...thStyle, width: "100px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: "3rem",
                          color: "#aaa",
                        }}
                      >
                        업체를 먼저 추가해주세요.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const isEditing = editingId === r.platformId;
                      return (
                        <tr
                          key={r.platformId}
                          style={{
                            borderBottom: "1px solid #f9f9f9",
                            background: isEditing ? "#fafeff" : "#fff",
                          }}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 500 }}>{r.name}</span>
                            {r.hasData && !isEditing && (
                              <span
                                style={{
                                  marginLeft: "6px",
                                  fontSize: "10px",
                                  color: "#059669",
                                  background: "#d1fae5",
                                  padding: "2px 6px",
                                  borderRadius: "99px",
                                }}
                              >
                                저장됨
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "3px 8px",
                                borderRadius: "99px",
                                ...regionBadge(r.region),
                              }}
                            >
                              {r.region}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editValues.amount}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    amount: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  border: "1.5px solid #1d4ed8",
                                  borderRadius: "7px",
                                  fontSize: "13px",
                                  outline: "none",
                                  textAlign: "right",
                                }}
                                autoFocus
                              />
                            ) : (
                              <span
                                style={{
                                  fontWeight: r.amount ? 600 : 400,
                                  color: r.amount ? "#1a1a1a" : "#ccc",
                                }}
                              >
                                {r.amount ? fmt(r.amount) : "미입력"}
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValues.memo}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    memo: e.target.value,
                                  }))
                                }
                                placeholder="비고"
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  border: "1.5px solid #1d4ed8",
                                  borderRadius: "7px",
                                  fontSize: "13px",
                                  outline: "none",
                                }}
                              />
                            ) : (
                              <span
                                style={{ color: r.memo ? "#1a1a1a" : "#ccc" }}
                              >
                                {r.memo || "-"}
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  onClick={() => handleSave(r)}
                                  disabled={saving}
                                  style={{
                                    padding: "5px 10px",
                                    background: "#1d4ed8",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  style={{
                                    padding: "5px 8px",
                                    background: "#f0f0f0",
                                    color: "#555",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                  }}
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(r)}
                                style={{
                                  padding: "5px 12px",
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                }}
                              >
                                수정
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 업체 관리 */}
        {subTab === "manage" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "1rem",
              }}
            >
              <button onClick={openAdd} className="btn-primary">
                ＋ 업체 추가
              </button>
            </div>
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
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
                      background: "#fafafa",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <th style={thStyle}>업체명</th>
                    <th style={thStyle}>지역</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {platforms.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: "center",
                          padding: "3rem",
                          color: "#aaa",
                        }}
                      >
                        등록된 업체가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    platforms.map((p) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: "1px solid #f9f9f9" }}
                      >
                        <td style={{ ...tdStyle, fontWeight: 500 }}>
                          {p.name}
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "3px 8px",
                              borderRadius: "99px",
                              ...regionBadge(p.region),
                            }}
                          >
                            {p.region || "국내"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => openEdit(p)}
                              style={editBtnStyle}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeletePlatform(p.id, p.name)}
                              className="delete-btn"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 통계 */}
        {subTab === "stats" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1.2rem",
              }}
            >
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={selStyle}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                padding: "1rem 1.4rem",
                marginBottom: "1.2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    marginBottom: "4px",
                  }}
                >
                  {year}년 총 정산
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#1d4ed8",
                  }}
                >
                  {fmt(grandTotal)}
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "#888" }}>
                {platformTotals.length}개 업체
              </div>
            </div>

            {/* 월별 업체별 스택 바 */}
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.2rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  marginBottom: "1rem",
                }}
              >
                📅 월별 업체별 정산 금액
              </p>
              {yearlyData.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#aaa",
                    padding: "3rem",
                    fontSize: "13px",
                  }}
                >
                  데이터 없음
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={monthlyChartData}
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) =>
                          v >= 10000 ? (v / 10000).toFixed(0) + "만" : v
                        }
                        tick={{ fontSize: 11 }}
                        width={50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {platformNames.map((name, i) => (
                        <Bar
                          key={name}
                          dataKey={name}
                          stackId="a"
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          radius={
                            i === platformNames.length - 1
                              ? [4, 4, 0, 0]
                              : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    {platformNames.map((name, i) => (
                      <div
                        key={name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "3px",
                            background: PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span style={{ color: "#555" }}>{name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {/* 파이 */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "1.2rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    marginBottom: "1rem",
                  }}
                >
                  🏢 업체별 비율
                </p>
                {platformTotals.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#aaa",
                      paddingTop: "3rem",
                      fontSize: "13px",
                    }}
                  >
                    데이터 없음
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={platformTotals}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ percent }) =>
                            `${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {platformTotals.map((p, i) => (
                            <Cell key={i} fill={p.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginTop: "8px",
                      }}
                    >
                      {platformTotals.map((p) => (
                        <div
                          key={p.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                          }}
                        >
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: p.color,
                            }}
                          />
                          <span style={{ color: "#555" }}>{p.name}</span>
                          <span style={{ color: "#888" }}>
                            (
                            {grandTotal > 0
                              ? ((p.value / grandTotal) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 업체별 바 */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "1.2rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1a1a1a",
                    marginBottom: "1rem",
                  }}
                >
                  📋 업체별 연간 합계
                </p>
                {platformTotals.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#aaa",
                      paddingTop: "3rem",
                      fontSize: "13px",
                    }}
                  >
                    데이터 없음
                  </div>
                ) : (
                  platformTotals
                    .sort((a, b) => b.value - a.value)
                    .map((p) => (
                      <div key={p.name} style={{ marginBottom: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 500 }}>
                            {p.name}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color: p.color,
                            }}
                          >
                            {fmt(p.value)}
                          </span>
                        </div>
                        <div
                          style={{
                            height: "6px",
                            background: "#f0f0f0",
                            borderRadius: "99px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${grandTotal > 0 ? (p.value / grandTotal) * 100 : 0}%`,
                              height: "100%",
                              background: p.color,
                              borderRadius: "99px",
                            }}
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">업체 {editTarget ? "수정" : "추가"}</h3>
            <form onSubmit={handleSubmitPlatform} className="modal-form">
              <div className="field">
                <label>업체명 *</label>
                <input
                  type="text"
                  placeholder="업체명 입력"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field">
                <label>지역 *</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["국내", "해외"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, region: r })}
                      style={{
                        flex: 1,
                        padding: "10px",
                        border: "1.5px solid",
                        borderRadius: "8px",
                        fontSize: "13px",
                        cursor: "pointer",
                        fontWeight: formData.region === r ? 600 : 400,
                        ...(formData.region === r
                          ? regionBadge(r)
                          : {
                              background: "#fff",
                              color: "#555",
                              borderColor: "#e0e0e0",
                            }),
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  {editTarget ? "수정" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const selStyle = {
  padding: "8px 12px",
  border: "1.5px solid #e0e0e0",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
};
const thStyle = {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: "12px",
  color: "#888",
  fontWeight: 500,
};
const tdStyle = { padding: "12px 14px" };
const editBtnStyle = {
  padding: "4px 10px",
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "6px",
  fontSize: "12px",
  cursor: "pointer",
};
