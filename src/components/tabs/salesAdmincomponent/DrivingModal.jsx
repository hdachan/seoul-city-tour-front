import DrivingTimeFields from "./DrivingTimeFields";
import { fmt, TYPES, TYPE_STYLE, unitSuffix } from "./salesShared";

// 📋 운행일지 추가/수정 입력창 (영업 정산 · 영업 정산관리 공용)
//   form / setForm   : 입력값 (화면마다 자기 상태를 넘김)
//   dateMin/dateMax  : 고를 수 있는 날짜 범위 (없으면 제한 없음)
//   meter            : 미터기 검사 값 { lowerMeter, nextMeter, distPreview, tooLow, tooHigh }
//   dest             : 도착지 자동완성 { list, search, setSearch, show, setShow, ref }
export default function DrivingModal({
  variant,
  form,
  setForm,
  isEdit,
  error,
  onClose,
  onSubmit,
  dateMin,
  dateMax,
  meter,
  dest,
}) {
  const isAdmin = variant === "admin";
  const { lowerMeter, nextMeter, distPreview } = meter;
  const meterTooLow = meter.tooLow;
  const meterTooHigh = meter.tooHigh;
  const destinations = dest.list;
  const destSearch = dest.search;
  const setDestSearch = dest.setSearch;
  const showDestDrop = dest.show;
  const setShowDestDrop = dest.setShow;
  const destRef = dest.ref;

  return (
    <div className="modal-bg" style={{ alignItems: "center" }}>
      <div
        className="modal"
        style={{ width: "480px", borderRadius: "14px", maxHeight: "90vh" }}
      >
        <div className="modal-header">
          <h3 className="modal-title" style={{ margin: 0 }}>
            운행일지 {isEdit ? "수정" : "추가"}
          </h3>
          <button
            className="modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="modal-form">
          {/* 날짜 - 모든 구분 하루 단위 */}
          <div className="field">
            <label>날짜 *</label>
            <input
              type="date"
              value={form.startDate || ""}
              min={dateMin}
              max={dateMax}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  startDate: e.target.value,
                  endDate: "",
                }))
              }
              required
            />
          </div>

          {/* 업무 */}
          {form.type === "업무" && (
            <>
              <DrivingTimeFields
                form={form}
                setForm={setForm}
              />
              <div
                className="field"
                style={{ position: "relative" }}
                ref={destRef}
              >
                <label>도착지 *</label>
                <input
                  type="text"
                  placeholder="경복궁"
                  value={form.destination || ""}
                  autoComplete="off"
                  required
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      destination: e.target.value,
                    }));
                    setDestSearch(e.target.value);
                    setShowDestDrop(true);
                  }}
                  onFocus={() => setShowDestDrop(true)}
                />
                {showDestDrop &&
                  destinations.filter((d) =>
                    d
                      .toLowerCase()
                      .includes((destSearch || "").toLowerCase()),
                  ).length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #e8eaed",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        zIndex: 100,
                        maxHeight: "90px",
                        overflowY: "auto",
                      }}
                    >
                      {destinations
                        .filter((d) =>
                          d
                            .toLowerCase()
                            .includes((destSearch || "").toLowerCase()),
                        )
                        .slice(0, 3)
                        .map((d) => (
                          <div
                            key={d}
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                destination: d,
                              }));
                              setShowDestDrop(false);
                            }}
                            style={{
                              padding: "9px 14px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                            onMouseEnter={(e) =>
                              (e.target.style.background = "#f4f5f7")
                            }
                            onMouseLeave={(e) =>
                              (e.target.style.background = "#fff")
                            }
                          >
                            {d}
                          </div>
                        ))}
                    </div>
                  )}
              </div>
              <div className="field">
                {isAdmin ? (
                  <MeterLabel lowerMeter={lowerMeter} nextMeter={nextMeter} />
                ) : (
                  <label>
                    미터기 (km) *{" "}
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#1557b0",
                        fontWeight: 400,
                      }}
                    >
                      현재 기준: {fmt(lowerMeter)}km 이상
                      {nextMeter > 0 && ` ~ ${fmt(nextMeter)}km 이하`}
                    </span>
                  </label>
                )}
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder={isAdmin ? "계량기 숫자" : "오늘 계량기"}
                    value={form.meterReading || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        meterReading: e.target.value,
                      }))
                    }
                    style={{ width: "100%", paddingRight: "40px" }}
                    required
                  />
                  <span style={unitSuffix}>km</span>
                </div>
                {distPreview !== null && distPreview >= 0 && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#1557b0",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    운행거리: {fmt(distPreview)}km
                  </p>
                )}
                {meterTooLow && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    ⚠ 이전 미터기({fmt(lowerMeter)}km)보다 낮습니다!
                  </p>
                )}
                {meterTooHigh && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    ⚠ 이후 날짜 미터기({fmt(nextMeter)}km)보다 큽니다!
                  </p>
                )}
              </div>
              <div className="field">
                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>비고</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        notes: [
                          ...(f.notes || []),
                          { content: "", time: "" },
                        ],
                      }))
                    }
                    style={{
                      fontSize: "11px",
                      color: "#1557b0",
                      background: "none",
                      border: "1px solid #1557b0",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      cursor: "pointer",
                    }}
                  >
                    ＋ 추가
                  </button>
                </label>
                {(form.notes || [{ content: "", time: "" }]).map(
                  (note, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "6px",
                        marginBottom: "6px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="time"
                        value={note.time || ""}
                        onChange={(e) => {
                          const newNotes = [...(form.notes || [])];
                          newNotes[i] = {
                            ...newNotes[i],
                            time: e.target.value,
                          };
                          setForm((f) => ({
                            ...f,
                            notes: newNotes,
                          }));
                        }}
                        style={{ width: "130px", flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        placeholder={`비고 ${i + 1}`}
                        value={note.content || ""}
                        onChange={(e) => {
                          const newNotes = [...(form.notes || [])];
                          newNotes[i] = {
                            ...newNotes[i],
                            content: e.target.value,
                          };
                          setForm((f) => ({
                            ...f,
                            notes: newNotes,
                          }));
                        }}
                        style={{ flex: 1 }}
                      />
                      {(form.notes || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newNotes = (
                              form.notes || []
                            ).filter((_, idx) => idx !== i);
                            setForm((f) => ({
                              ...f,
                              notes: newNotes,
                            }));
                          }}
                          style={{
                            background: "none",
                            border: "1px solid #e0e0e0",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            color: "#888",
                            fontSize: "12px",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ),
                )}
              </div>
            </>
          )}

          {/* 주유 */}
          {form.type === "주유" && (
            <>
              <div
                style={{
                  background: "#fef3c7",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #fde68a",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#92400e",
                    marginBottom: "10px",
                  }}
                >
                  ⛽ 주유 정보
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div className="field">
                    <label>주유량 *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="48.13"
                        value={form.fuelAmount || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fuelAmount: e.target.value,
                          }))
                        }
                        style={{ width: "100%", paddingRight: "24px" }}
                        required
                      />
                      <span style={{ ...unitSuffix, fontSize: "11px" }}>
                        L
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label>주유금액 *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="52000"
                        value={form.fuelCost || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fuelCost: e.target.value,
                          }))
                        }
                        style={{ width: "100%", paddingRight: "24px" }}
                        required
                      />
                      <span style={{ ...unitSuffix, fontSize: "11px" }}>
                        원
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label>단가 *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="1615"
                        value={form.fuelUnitPrice || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fuelUnitPrice: e.target.value,
                          }))
                        }
                        style={{ width: "100%", paddingRight: "24px" }}
                        required
                      />
                      <span style={{ ...unitSuffix, fontSize: "11px" }}>
                        원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 개인주유 */}
          {form.type === "개인주유" && (
            <>
              <div
                style={{
                  background: "#fce7f3",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #f9a8d4",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#9d174d",
                    marginBottom: "10px",
                  }}
                >
                  ⛽ 개인 주유
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div className="field">
                    <label>주유량</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="48.13"
                        value={form.fuelAmount || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fuelAmount: e.target.value,
                          }))
                        }
                        style={{ width: "100%", paddingRight: "24px" }}
                      />
                      <span style={{ ...unitSuffix, fontSize: "11px" }}>
                        L
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label>주유금액</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="52000"
                        value={form.fuelCost || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fuelCost: e.target.value,
                          }))
                        }
                        style={{ width: "100%", paddingRight: "24px" }}
                      />
                      <span style={{ ...unitSuffix, fontSize: "11px" }}>
                        원
                      </span>
                    </div>
                  </div>
                  <div className="field">
                    <label>단가</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="1615"
                        value={form.fuelUnitPrice || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            fuelUnitPrice: e.target.value,
                          }))
                        }
                        style={{ width: "100%", paddingRight: "24px" }}
                      />
                      <span style={{ ...unitSuffix, fontSize: "11px" }}>
                        원
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 개인 사용 */}
          {form.type === "개인사용" && (
            <>
              <div className="field">
                {isAdmin ? (
                  <MeterLabel lowerMeter={lowerMeter} nextMeter={nextMeter} />
                ) : (
                  <label>미터기 (km) *</label>
                )}
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder={isAdmin ? "계량기 숫자" : "오늘 계량기"}
                    value={form.meterReading || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        meterReading: e.target.value,
                      }))
                    }
                    style={{ width: "100%", paddingRight: "40px" }}
                    required
                  />
                  <span style={unitSuffix}>km</span>
                </div>
                {!isAdmin && distPreview !== null && distPreview >= 0 && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#9d174d",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    개인 운행거리: {fmt(distPreview)}km
                  </p>
                )}
                {meterTooLow && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    ⚠ 이전 미터기({fmt(lowerMeter)}km)보다 낮습니다!
                  </p>
                )}
                {meterTooHigh && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#dc2626",
                      marginTop: "4px",
                      fontWeight: 600,
                    }}
                  >
                    ⚠ 이후 날짜 미터기({fmt(nextMeter)}km)보다 큽니다!
                  </p>
                )}
              </div>
            </>
          )}

          {/* 구분 - 맨 아래 */}
          <div className="field">
            <label>구분 *</label>
            <div style={{ display: "flex", gap: "6px" }}>
              {TYPES.map((t) => {
                const c = TYPE_STYLE[t];
                const isActive = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        type: t,
                        destination: "",
                        departureTime: "",
                        arrivalTime: "",
                        fuelAmount: "",
                        fuelCost: "",
                        fuelUnitPrice: "",
                        meterReading: "",
                      }))
                    }
                    style={{
                      flex: 1,
                      padding: isAdmin ? "9px" : "10px",
                      border: `1.5px solid ${isActive ? c.color : "#e0e0e0"}`,
                      borderRadius: "8px",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: isActive ? 700 : 400,
                      background: isActive ? c.bg : "#fff",
                      color: isActive ? c.color : "#888",
                    }}
                  >
                    {t === "주유"
                      ? "⛽ "
                      : t === "개인주유"
                        ? "⛽ "
                        : t === "개인사용"
                          ? "🚗 "
                          : "💼 "}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="field-error">⚠ {error}</p>}
          <div className="modal-btns">
            <button
              type="button"
              className="btn-outline"
              onClick={onClose}
            >
              취소
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 미터기 칸 제목 + 입력 가능 범위 안내 (예: 기준: 1,000km 이상 ~ 1,200km 이하)
function MeterLabel({ lowerMeter, nextMeter }) {
  return (
    <label>
      미터기 (km) *
      {lowerMeter > 0 && (
        <span
          style={{
            fontSize: "11px",
            color: "#1557b0",
            fontWeight: 400,
            marginLeft: "6px",
          }}
        >
          기준: {fmt(lowerMeter)}km 이상
          {nextMeter > 0 && ` ~ ${fmt(nextMeter)}km 이하`}
        </span>
      )}
    </label>
  );
}
