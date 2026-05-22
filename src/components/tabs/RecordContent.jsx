import { useEffect, useState, useRef } from "react";
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
  fetchRecords,
  addRecord,
  removeRecord,
  fetchCategories,
  addCategory,
  removeCategory,
} from "../../api/auth";
import axios from "axios";

const BASE_URL = "http://1.234.65.127:8080/api";
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});
const fetchRecordsByMonth = (year, month) =>
  axios.get(`${BASE_URL}/record/list`, {
    ...authHeader(),
    params: { year, month },
  });
const fetchStats = (year) =>
  axios.get(`${BASE_URL}/record/stats`, { ...authHeader(), params: { year } });
const updateRecord = (id, data) =>
  axios.put(`${BASE_URL}/record/${id}`, data, authHeader());

const PIE_COLORS = [
  "#1d4ed8",
  "#059669",
  "#e53e3e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function RecordContent() {
  const now = new Date();
  const [subTab, setSubTab] = useState("list");

  // 년/월 선택
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [statsYear, setStatsYear] = useState(now.getFullYear());

  // 날짜 min/max (선택된 달 기준)
  const minDate = `${selYear}-${String(selMonth).padStart(2, "0")}-01`;
  const maxDate = new Date(selYear, selMonth, 0).toISOString().split("T")[0];
  const defaultDate = () => {
    const isCurrentMonth =
      selYear === now.getFullYear() && selMonth === now.getMonth() + 1;
    return isCurrentMonth ? now.toISOString().split("T")[0] : minDate;
  };

  // 기록 상태
  const [records, setRecords] = useState([]);
  const [cat1List, setCat1List] = useState([]);
  const [cat2List, setCat2List] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null=추가, obj=수정
  const [showCatModal, setShowCatModal] = useState(false);
  const [catType, setCatType] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    date: "",
    category1Id: "",
    category2Id: "",
    count: 1,
    memo: "",
  });
  const [catForm, setCatForm] = useState({ name: "", price: "" });

  // ... 메뉴
  const [openMenu, setOpenMenu] = useState(null); // row id
  const menuRef = useRef(null);

  // 통계
  const [stats, setStats] = useState(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const calcTotal = () => {
    const cat1 = cat1List.find(
      (c) => String(c.id) === String(form.category1Id),
    );
    const cat2 = cat2List.find(
      (c) => String(c.id) === String(form.category2Id),
    );
    if (!cat1 || !cat2 || !form.count) return 0;
    return (cat1.price + cat2.price) * form.count;
  };

  const loadRecords = async () => {
    try {
      const [r, c1, c2] = await Promise.all([
        fetchRecordsByMonth(selYear, selMonth),
        fetchCategories(1),
        fetchCategories(2),
      ]);
      setRecords(r.data);
      setCat1List(c1.data);
      setCat2List(c2.data);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetchStats(statsYear);
      setStats(res.data);
    } catch {
      setError("통계를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    loadRecords();
  }, [selYear, selMonth]);
  useEffect(() => {
    if (subTab === "stats") loadStats();
  }, [subTab, statsYear]);

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openAddModal = () => {
    setError("");
    setEditTarget(null);
    setForm({
      date: defaultDate(),
      category1Id: "",
      category2Id: "",
      count: 1,
      memo: "",
    });
    setShowModal(true);
  };

  const openEditModal = (r) => {
    setError("");
    setEditTarget(r);
    setOpenMenu(null);
    setForm({
      date: r.date,
      category1Id: r.category1?.id || "",
      category2Id: r.category2?.id || "",
      count: r.count,
      memo: r.memo || "",
    });
    setShowModal(true);
  };

  const handleSubmitRecord = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.date || !form.category1Id || !form.category2Id || !form.count) {
      setError("날짜, 내역1, 내역2, 대수를 모두 입력해주세요.");
      return;
    }
    try {
      if (editTarget) {
        await updateRecord(editTarget.id, {
          ...form,
          count: Number(form.count),
        });
        setSuccess("수정되었습니다.");
      } else {
        await addRecord({ ...form, count: Number(form.count) });
        setSuccess("기록이 추가되었습니다.");
      }
      setShowModal(false);
      loadRecords();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };

  const handleDeleteRecord = async (id) => {
    setOpenMenu(null);
    if (!window.confirm("이 기록을 삭제할까요?")) return;
    try {
      await removeRecord(id);
      setSuccess("삭제되었습니다.");
      loadRecords();
    } catch {
      setError("삭제 실패");
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setError("");
    if (!catForm.name || !catForm.price) {
      setError("이름과 가격을 입력해주세요.");
      return;
    }
    try {
      await addCategory(catType, catForm.name, Number(catForm.price));
      setCatForm({ name: "", price: "" });
      loadRecords();
    } catch (err) {
      setError(err.response?.data?.error || "카테고리 추가 실패");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("이 카테고리를 삭제할까요?")) return;
    try {
      await removeCategory(id);
      loadRecords();
    } catch {
      setError("삭제 실패");
    }
  };

  const fmt = (n) => Number(n).toLocaleString() + "원";
  const monthTotal = records.reduce((s, r) => s + (r.total || 0), 0);
  const monthCount = records.reduce((s, r) => s + (r.count || 0), 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e8eaed",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "4px" }}>{label}</p>
        {payload.map((p) => (
          <div
            key={p.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <span style={{ color: p.fill }}>
              {p.name === "total"
                ? "매출"
                : p.name === "count"
                  ? "대수"
                  : p.name}
            </span>
            <span style={{ fontWeight: 600 }}>
              {p.name === "count" ? `${p.value}대` : fmt(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const subTabs = [
    { id: "list", label: "📋 운행 기록" },
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
      <div style={{ width: "150px", flexShrink: 0 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid #e8eaed",
          }}
        >
          {subTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "none",
                textAlign: "left",
                fontSize: "13px",
                fontWeight: subTab === t.id ? 600 : 400,
                cursor: "pointer",
                background: subTab === t.id ? "#e8f0fe" : "#fff",
                color: subTab === t.id ? "#1557b0" : "#555",
                borderLeft:
                  subTab === t.id
                    ? "3px solid #1557b0"
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

        {/* 운행 기록 탭 */}
        {subTab === "list" && (
          <div>
            {/* 필터 바 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "14px",
                background: "#fff",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #e8eaed",
              }}
            >
              <select
                value={selYear}
                onChange={(e) => setSelYear(Number(e.target.value))}
                style={selStyle}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <select
                value={selMonth}
                onChange={(e) => setSelMonth(Number(e.target.value))}
                style={selStyle}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>

              {/* 월 요약 */}
              {records.length > 0 && (
                <div
                  style={{ display: "flex", gap: "16px", marginLeft: "8px" }}
                >
                  <span style={{ fontSize: "13px", color: "#555" }}>
                    총{" "}
                    <strong style={{ color: "#1557b0" }}>
                      {records.length}건
                    </strong>
                  </span>
                  <span style={{ fontSize: "13px", color: "#555" }}>
                    <strong style={{ color: "#1557b0" }}>{monthCount}대</strong>
                  </span>
                  <span style={{ fontSize: "13px", color: "#555" }}>
                    합계{" "}
                    <strong style={{ color: "#1557b0" }}>
                      {fmt(monthTotal)}
                    </strong>
                  </span>
                </div>
              )}

              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setCatType(1);
                    setError("");
                    setShowCatModal(true);
                  }}
                >
                  카테고리 관리
                </button>
                <button className="btn-primary" onClick={openAddModal}>
                  ＋ 기록 추가
                </button>
              </div>
            </div>

            {/* 테이블 */}
            <div className="gf-table-wrap">
              <table
                className="gf-table"
                style={{ tableLayout: "fixed", width: "100%" }}
              >
                <colgroup>
                  <col style={{ width: "100px" }} /> {/* 날짜 */}
                  <col style={{ width: "14%" }} /> {/* 내역1 */}
                  <col style={{ width: "14%" }} /> {/* 내역2 */}
                  <col style={{ width: "60px" }} /> {/* 대수 */}
                  <col style={{ width: "110px" }} /> {/* 내역1 가격 */}
                  <col style={{ width: "110px" }} /> {/* 내역2 가격 */}
                  <col style={{ width: "120px" }} /> {/* 토탈 */}
                  <col /> {/* 비고 */}
                  <col style={{ width: "56px" }} /> {/* 삭제 */}
                </colgroup>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>내역1</th>
                    <th>내역2</th>
                    <th style={{ textAlign: "center" }}>대수</th>
                    <th style={{ textAlign: "right" }}>내역1 가격</th>
                    <th style={{ textAlign: "right" }}>내역2 가격</th>
                    <th style={{ textAlign: "right" }}>토탈</th>
                    <th>비고</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty">
                        {selYear}년 {selMonth}월 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontSize: "12px", color: "#888" }}>
                          {r.date}
                        </td>
                        <td
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.category1?.name || "-"}
                        </td>
                        <td
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.category2?.name || "-"}
                        </td>
                        <td className="td-center">{r.count}대</td>
                        <td className="td-right">
                          {r.category1?.price ? fmt(r.category1.price) : "-"}
                        </td>
                        <td className="td-right">
                          {r.category2?.price ? fmt(r.category2.price) : "-"}
                        </td>
                        <td className="td-right total-cell">{fmt(r.total)}</td>
                        <td
                          style={{
                            color: "#888",
                            fontSize: "12px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.memo || "-"}
                        </td>
                        <td style={{ position: "relative" }}>
                          <button
                            onClick={() =>
                              setOpenMenu(openMenu === r.id ? null : r.id)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "16px",
                              color: "#888",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              lineHeight: 1,
                            }}
                            title="더보기"
                          >
                            ···
                          </button>
                          {openMenu === r.id && (
                            <div
                              ref={menuRef}
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                zIndex: 50,
                                background: "#fff",
                                border: "1px solid #e8eaed",
                                borderRadius: "8px",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                                overflow: "hidden",
                                minWidth: "100px",
                              }}
                            >
                              <button
                                onClick={() => openEditModal(r)}
                                style={menuItemStyle}
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(r.id)}
                                style={{ ...menuItemStyle, color: "#dc2626" }}
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 통계 탭 */}
        {subTab === "stats" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "1.2rem",
              }}
            >
              <select
                value={statsYear}
                onChange={(e) => setStatsYear(Number(e.target.value))}
                style={selStyle}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "13px", color: "#888" }}>연간 통계</span>
            </div>

            {!stats ? (
              <div
                style={{ textAlign: "center", padding: "3rem", color: "#aaa" }}
              >
                데이터 없음
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    marginBottom: "1.2rem",
                  }}
                >
                  <StatCard
                    label={`${statsYear}년 총 매출`}
                    value={fmt(stats.grandTotal)}
                    color="#1557b0"
                    bg="#e8f0fe"
                  />
                  <StatCard
                    label="총 운행 대수"
                    value={`${Number(stats.grandCount).toLocaleString()}대`}
                    color="#059669"
                    bg="#d1fae5"
                  />
                  <StatCard
                    label="월 평균 매출"
                    value={fmt(Math.round(stats.grandTotal / 12))}
                    color="#92400e"
                    bg="#fef3c7"
                  />
                </div>

                <ChartCard title="📅 월별 운행 매출">
                  {stats.monthlyChart.every((m) => m.total === 0) ? (
                    <Empty />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={stats.monthlyChart}
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
                        <Bar
                          dataKey="total"
                          name="total"
                          fill="#1557b0"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="🚌 월별 운행 대수"
                  style={{ marginTop: "12px" }}
                >
                  {stats.monthlyChart.every((m) => m.count === 0) ? (
                    <Empty />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={stats.monthlyChart}
                        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={40} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="count"
                          name="count"
                          fill="#059669"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginTop: "12px",
                  }}
                >
                  <PieCard
                    title="📊 내역1 카테고리별"
                    data={stats.cat1Chart}
                    fmt={fmt}
                  />
                  <PieCard
                    title="📊 내역2 카테고리별"
                    data={stats.cat2Chart}
                    fmt={fmt}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 기록 추가/수정 모달 */}
      {showModal && (
        <div className="modal-bg">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              운행 기록 {editTarget ? "수정" : "추가"}
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "#888",
                marginBottom: "16px",
                marginTop: "-12px",
              }}
            >
              {selYear}년 {selMonth}월 · {selMonth}월 날짜만 선택 가능합니다
            </p>
            <form onSubmit={handleSubmitRecord} className="modal-form">
              <div className="field">
                <label>날짜 *</label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="field">
                <label>내역1</label>
                <select
                  value={form.category1Id}
                  onChange={(e) =>
                    setForm({ ...form, category1Id: e.target.value })
                  }
                >
                  <option value="">선택하세요</option>
                  {cat1List.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.price.toLocaleString()}원)
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>내역2</label>
                <select
                  value={form.category2Id}
                  onChange={(e) =>
                    setForm({ ...form, category2Id: e.target.value })
                  }
                >
                  <option value="">선택하세요</option>
                  {cat2List.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.price.toLocaleString()}원)
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>대수</label>
                <input
                  type="number"
                  min="1"
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: e.target.value })}
                />
              </div>
              {form.category1Id && form.category2Id && form.count > 0 && (
                <div className="total-preview">
                  예상 토탈:{" "}
                  <strong>
                    {fmt(
                      (Number(
                        cat1List.find(
                          (c) => String(c.id) === String(form.category1Id),
                        )?.price || 0,
                      ) +
                        Number(
                          cat2List.find(
                            (c) => String(c.id) === String(form.category2Id),
                          )?.price || 0,
                        )) *
                        Number(form.count),
                    )}
                  </strong>
                </div>
              )}
              <div className="field">
                <label>비고</label>
                <input
                  type="text"
                  placeholder="메모 (선택)"
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                />
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

      {/* 카테고리 관리 모달 */}
      {showCatModal && (
        <div className="modal-bg" onClick={() => setShowCatModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">카테고리 관리</h3>
            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
              {[1, 2].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCatType(t)}
                  style={{
                    flex: 1,
                    padding: "9px",
                    border: "1.5px solid",
                    borderRadius: "7px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: catType === t ? 600 : 400,
                    background: catType === t ? "#e8f0fe" : "#fff",
                    color: catType === t ? "#1557b0" : "#555",
                    borderColor: catType === t ? "#93c5fd" : "#d8dce3",
                  }}
                >
                  내역{t}
                </button>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginBottom: "14px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {(catType === 1 ? cat1List : cat2List).map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "#f8f9fb",
                    borderRadius: "7px",
                    border: "1px solid #e8eaed",
                  }}
                >
                  <span style={{ fontWeight: 500, fontSize: "13px" }}>
                    {c.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#888" }}>
                      {c.price.toLocaleString()}원
                    </span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {(catType === 1 ? cat1List : cat2List).length === 0 && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#bbb",
                    padding: "1.5rem",
                    fontSize: "13px",
                  }}
                >
                  등록된 카테고리가 없습니다.
                </p>
              )}
            </div>
            <form
              onSubmit={handleAddCategory}
              style={{ display: "flex", gap: "8px" }}
            >
              <input
                type="text"
                placeholder="카테고리 이름"
                value={catForm.name}
                onChange={(e) =>
                  setCatForm({ ...catForm, name: e.target.value })
                }
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1.5px solid #d8dce3",
                  borderRadius: "7px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <input
                type="number"
                placeholder="단가"
                value={catForm.price}
                onChange={(e) =>
                  setCatForm({ ...catForm, price: e.target.value })
                }
                style={{
                  width: "90px",
                  padding: "8px 12px",
                  border: "1.5px solid #d8dce3",
                  borderRadius: "7px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button type="submit" className="btn-primary">
                추가
              </button>
            </form>
            {error && (
              <p className="field-error" style={{ marginTop: "8px" }}>
                ⚠ {error}
              </p>
            )}
            <div className="modal-btns" style={{ marginTop: "1rem" }}>
              <button
                className="btn-outline"
                onClick={() => setShowCatModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 서브 컴포넌트
function StatCard({ label, value, color, bg }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        border: "1px solid #e8eaed",
        padding: "14px 16px",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#888",
          marginBottom: "6px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "20px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        border: "1px solid #e8eaed",
        padding: "16px",
        ...style,
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#1a1a2e",
          marginBottom: "14px",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function PieCard({ title, data, fmt }) {
  const colors = [
    "#1d4ed8",
    "#059669",
    "#e53e3e",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
  ];
  return (
    <ChartCard title={title}>
      {!data?.length ? (
        <Empty />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
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
            {data.map((c, i) => (
              <div
                key={c.name}
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
                    background: colors[i % colors.length],
                  }}
                />
                <span style={{ color: "#555" }}>{c.name}</span>
                <span style={{ color: "#888" }}>{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}

function Empty() {
  return (
    <div
      style={{
        textAlign: "center",
        color: "#bbb",
        padding: "2rem",
        fontSize: "13px",
      }}
    >
      데이터 없음
    </div>
  );
}

const selStyle = {
  padding: "7px 12px",
  border: "1.5px solid #d8dce3",
  borderRadius: "7px",
  fontSize: "13px",
  outline: "none",
  background: "#fff",
  cursor: "pointer",
};
const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "9px 16px",
  border: "none",
  background: "#fff",
  fontSize: "13px",
  color: "#333",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 0.1s",
};
