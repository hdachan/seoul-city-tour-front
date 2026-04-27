import { useEffect, useState, useCallback } from "react";
import {
  fetchGinsengPrice,
  saveGinsengPrice,
  fetchGuides,
  fetchAllGuides,
  addGinsengGuide,
  toggleGinsengGuide,
  fetchGinsengMonthly,
  saveGinsengRecord,
  deleteGinsengRecord,
} from "../../api/auth";
import "./GinsengContent.css";

export default function GinsengContent() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [guides, setGuides] = useState([]); // 활성 가이드
  const [allGuides, setAllGuides] = useState([]); // 전체 가이드 (관리용)
  const [records, setRecords] = useState([]);
  const [price, setPrice] = useState(5000);
  const [editPrice, setEditPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(5000);
  const [cellMap, setCellMap] = useState({}); // "guideName_day" → {count, priceSnapshot}
  const [saving, setSaving] = useState("");
  const [showInactive, setShowInactive] = useState(false); // 비활성 가이드 보기
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [newGuideName, setNewGuideName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const load = useCallback(async () => {
    try {
      const [g, ag, p, r] = await Promise.all([
        fetchGuides(),
        fetchAllGuides(),
        fetchGinsengPrice(),
        fetchGinsengMonthly(year, month),
      ]);
      setGuides(g.data);
      setAllGuides(ag.data);
      setPrice(p.data.pricePerUnit);
      setTempPrice(p.data.pricePerUnit);
      setRecords(r.data);

      const map = {};
      r.data.forEach((rec) => {
        const day = Number(rec.date.split("-")[2]);
        map[`${rec.guideName}_${day}`] = {
          count: rec.count,
          priceSnapshot: rec.priceSnapshot,
        };
      });
      setCellMap(map);
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  // 단가 저장
  const handleSavePrice = async () => {
    try {
      await saveGinsengPrice(Number(tempPrice));
      setPrice(Number(tempPrice));
      setEditPrice(false);
      setSuccess(
        "단가가 저장되었습니다. 이후 새로 입력하는 데이터부터 적용됩니다.",
      );
    } catch {
      setError("단가 저장 실패");
    }
  };

  // 셀 입력
  const handleCellChange = (guideName, day, value) => {
    const key = `${guideName}_${day}`;
    setCellMap((prev) => ({ ...prev, [key]: { ...prev[key], count: value } }));
  };

  // 셀 저장 (blur 시)
  const handleCellBlur = async (guideName, day) => {
    const key = `${guideName}_${day}`;
    const value = cellMap[key]?.count;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    setSaving(key);
    try {
      // 빈 값이면 DB에서 삭제
      if (value === "" || value === undefined || value === null) {
        const existing = records.find(
          (r) => r.guideName === guideName && r.date === dateStr,
        );
        if (existing) {
          await deleteGinsengRecord(existing.id);
          await load();
        }
        return;
      }

      const count = parseFloat(value);
      if (isNaN(count) || count < 0) return;

      await saveGinsengRecord(guideName, dateStr, count);
      await load();
    } catch {
      setError("저장 실패");
    } finally {
      setSaving("");
    }
  };

  // 가이드 추가
  const handleAddGuide = async (e) => {
    e.preventDefault();
    setError("");
    if (!newGuideName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    try {
      await addGinsengGuide(newGuideName.trim());
      setNewGuideName("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "추가 실패");
    }
  };

  // 가이드 활성/비활성 토글
  const handleToggleGuide = async (id) => {
    try {
      await toggleGinsengGuide(id);
      load();
    } catch {
      setError("변경 실패");
    }
  };

  // 정산금액 계산 - priceSnapshot 사용 (저장 시점 단가)
  const guideTotal = (guideName) =>
    days.reduce((sum, day) => {
      const v = parseFloat(cellMap[`${guideName}_${day}`]?.count || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);

  const guideSettlement = (guideName) =>
    days.reduce((sum, day) => {
      const cell = cellMap[`${guideName}_${day}`];
      if (!cell) return sum;
      const v = parseFloat(cell.count || 0);
      const p = cell.priceSnapshot || price;
      return sum + (isNaN(v) ? 0 : v * p);
    }, 0);

  const grandTotal = guides.reduce((sum, g) => sum + guideTotal(g.name), 0);
  const grandSettlement = guides.reduce(
    (sum, g) => sum + guideSettlement(g.name),
    0,
  );

  const percent = (guideName) => {
    if (grandTotal === 0) return "-";
    return ((guideTotal(guideName) / grandTotal) * 100).toFixed(1) + "%";
  };

  // 표시할 가이드 (showInactive면 전체, 아니면 활성만)
  const displayGuides = showInactive ? allGuides : guides;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="ginseng-wrapper">
      {/* 툴바 */}
      <div className="ginseng-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="g-select"
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
            className="g-select"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          {/* 비활성 가이드 보기 토글 */}
          <button
            className={showInactive ? "btn-toggle-on" : "btn-toggle-off"}
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? "👁 전체 보기 중" : "👁 비활성 포함 보기"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* 단가 */}
          <div className="price-area">
            <span className="price-label">인삼 단가</span>
            {editPrice ? (
              <div
                style={{ display: "flex", gap: "6px", alignItems: "center" }}
              >
                <input
                  type="number"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(e.target.value)}
                  className="price-input"
                />
                <span style={{ fontSize: "13px" }}>원</span>
                <button className="btn-primary" onClick={handleSavePrice}>
                  저장
                </button>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setEditPrice(false);
                    setTempPrice(price);
                  }}
                >
                  취소
                </button>
              </div>
            ) : (
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span className="price-value">{price.toLocaleString()}원</span>
                <button
                  className="btn-outline"
                  onClick={() => setEditPrice(true)}
                >
                  수정
                </button>
              </div>
            )}
          </div>
          {/* 가이드 관리 */}
          <button
            className="btn-outline"
            onClick={() => setShowGuideModal(true)}
          >
            가이드 관리
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">⚠ {error}</div>}
      {success && (
        <div className="alert alert-success" onClick={() => setSuccess("")}>
          ✅ {success}
        </div>
      )}

      {/* 스프레드시트 */}
      <div className="ginseng-table-wrap">
        <table className="ginseng-table">
          <thead>
            <tr>
              <th className="th-guide">{month}월</th>
              {days.map((d) => (
                <th key={d} className="th-day">
                  {d}
                </th>
              ))}
              <th className="th-sum">합계</th>
              <th className="th-sum">정산금액</th>
              <th className="th-sum">비율</th>
            </tr>
          </thead>
          <tbody>
            {displayGuides.length === 0 ? (
              <tr>
                <td colSpan={days.length + 4} className="empty">
                  가이드를 추가해주세요.
                </td>
              </tr>
            ) : (
              displayGuides.map((g) => (
                <tr key={g.id} style={{ opacity: g.active ? 1 : 0.45 }}>
                  <td className="td-guide">
                    {!g.active && (
                      <span className="inactive-badge">비활성</span>
                    )}
                    {g.name}
                  </td>
                  {days.map((day) => {
                    const key = `${g.name}_${day}`;
                    const cell = cellMap[key];
                    return (
                      <td key={day} className="td-cell">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          className={`cell-input ${saving === key ? "saving" : ""}`}
                          value={cell?.count ?? ""}
                          onChange={(e) =>
                            handleCellChange(g.name, day, e.target.value)
                          }
                          onBlur={() => g.active && handleCellBlur(g.name, day)}
                          disabled={!g.active}
                          title={
                            cell?.priceSnapshot
                              ? `저장 단가: ${cell.priceSnapshot.toLocaleString()}원`
                              : ""
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="td-total">{guideTotal(g.name) || "-"}</td>
                  <td className="td-settle">
                    {guideSettlement(g.name)
                      ? Math.round(guideSettlement(g.name)).toLocaleString() +
                        "원"
                      : "-"}
                  </td>
                  <td className="td-percent">
                    {guideTotal(g.name) ? percent(g.name) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {displayGuides.length > 0 && (
            <tfoot>
              <tr>
                <td className="td-guide" style={{ fontWeight: 700 }}>
                  전체 합계
                </td>
                {days.map((day) => {
                  const dayTotal = guides.reduce((sum, g) => {
                    const v = parseFloat(
                      cellMap[`${g.name}_${day}`]?.count || 0,
                    );
                    return sum + (isNaN(v) ? 0 : v);
                  }, 0);
                  return (
                    <td
                      key={day}
                      className="td-cell"
                      style={{
                        fontWeight: 600,
                        color: "#1d4ed8",
                        textAlign: "center",
                        fontSize: "11px",
                      }}
                    >
                      {dayTotal > 0 ? dayTotal : ""}
                    </td>
                  );
                })}
                <td className="td-total" style={{ fontWeight: 700 }}>
                  {grandTotal}
                </td>
                <td className="td-settle" style={{ fontWeight: 700 }}>
                  {Math.round(grandSettlement).toLocaleString()}원
                </td>
                <td className="td-percent" style={{ fontWeight: 700 }}>
                  100%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="ginseng-hint">
        셀 입력 후 탭/클릭 이동 시 자동 저장 · 셀에 마우스 올리면 저장된 단가
        확인 가능
      </p>

      {/* 가이드 관리 모달 */}
      {showGuideModal && (
        <div className="modal-bg" onClick={() => setShowGuideModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">가이드 관리</h3>
            <p
              style={{ fontSize: "13px", color: "#888", marginBottom: "1rem" }}
            >
              비활성화된 가이드는 스프레드시트에서 숨겨지지만 데이터는
              유지됩니다.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "1rem",
                maxHeight: "280px",
                overflowY: "auto",
              }}
            >
              {allGuides.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: g.active ? "#f9f9f9" : "#f0f0f0",
                    borderRadius: "8px",
                    fontSize: "14px",
                    opacity: g.active ? 1 : 0.7,
                  }}
                >
                  <span style={{ fontWeight: g.active ? 500 : 400 }}>
                    {g.name}
                    {!g.active && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11px",
                          color: "#999",
                        }}
                      >
                        (비활성)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleToggleGuide(g.id)}
                    style={{
                      padding: "5px 12px",
                      border: "1px solid",
                      borderRadius: "6px",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontWeight: 500,
                      background: g.active ? "#fff0f0" : "#f0fff4",
                      color: g.active ? "#e53e3e" : "#276749",
                      borderColor: g.active ? "#fed7d7" : "#c6f6d5",
                    }}
                  >
                    {g.active ? "비활성화" : "활성화"}
                  </button>
                </div>
              ))}
              {allGuides.length === 0 && (
                <p className="empty">등록된 가이드가 없습니다.</p>
              )}
            </div>

            <form
              onSubmit={handleAddGuide}
              style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}
            >
              <input
                type="text"
                placeholder="가이드 이름 입력"
                value={newGuideName}
                onChange={(e) => setNewGuideName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button type="submit" className="btn-primary">
                추가
              </button>
            </form>

            {error && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#e53e3e",
                  marginBottom: "8px",
                }}
              >
                ⚠ {error}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-outline"
                onClick={() => setShowGuideModal(false)}
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
