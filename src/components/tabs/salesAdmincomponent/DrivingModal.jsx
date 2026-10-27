import { useState } from "react";
import DrivingTimeFields from "./DrivingTimeFields";
import { fmt, TYPES, TYPE_STYLE, HALF_DAYS, getKoreaTime } from "./salesShared";
import "./sales.css";

const TYPE_ICON = { 업무: "💼 ", 주유: "⛽ ", 개인주유: "⛽ ", 개인사용: "🚗 " };

// 📋 운행일지 추가/수정 입력창 (영업 정산 · 영업 정산관리 공용)
//   form / setForm   : 입력값 (화면마다 자기 상태를 넘김)
//   dateMin/dateMax  : 고를 수 있는 날짜 범위 (없으면 제한 없음)
//   meter            : 미터기 검사 값 { lowerMeter, nextMeter, distPreview, tooLow, tooHigh }
export default function DrivingModal({
  form,
  setForm,
  isEdit,
  error,
  onClose,
  onSubmit,
  dateMin,
  dateMax,
  meter,
}) {
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));


  const notes = form.notes || [];
  const setNote = (i, key, value) => {
    const newNotes = [...notes];
    newNotes[i] = { ...newNotes[i], [key]: value };
    setForm((f) => ({ ...f, notes: newNotes }));
  };

  return (
    <div className="sl-modal-bg">
      <div className="sl-modal sl-modal-driving">
        <div className="sl-modal-header">
          <h3 className="sl-modal-title">운행일지 {isEdit ? "수정" : "추가"}</h3>
          <button className="sl-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="sl-modal-form">
          {/* 날짜 - 모든 구분 하루 단위 */}
          <div className="sl-field">
            <label>날짜 *</label>
            <input
              type="date"
              value={form.startDate || ""}
              min={dateMin}
              max={dateMax}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value, endDate: "" }))
              }
              required
            />
          </div>

          {/* 업무 */}
          {form.type === "업무" && (
            <>
              <DrivingTimeFields form={form} setForm={setForm} />

              <DestField form={form} setForm={setForm} />

              <MeterField form={form} setField={setField} meter={meter} previewLabel="운행거리" />

              {/* 비고 (시간 + 내용, 여러 줄) */}
              <div className="sl-field">
                <label className="sl-label-row">
                  <span>비고</span>
                  <button
                    type="button"
                    className="sl-mini-btn"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        notes: [...(f.notes || []), { content: "", time: "" }],
                      }))
                    }
                  >
                    ＋ 추가
                  </button>
                </label>
                {(form.notes || [{ content: "", time: "" }]).map((note, i) => (
                  <div key={i} className="sl-note-row">
                    <input
                      type="time"
                      className="sl-note-time"
                      value={note.time || ""}
                      onChange={(e) => setNote(i, "time", e.target.value)}
                    />
                    <input
                      type="text"
                      className="sl-note-text"
                      placeholder={`비고 ${i + 1}`}
                      value={note.content || ""}
                      onChange={(e) => setNote(i, "content", e.target.value)}
                    />
                    {notes.length > 1 && (
                      <button
                        type="button"
                        className="sl-note-remove"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            notes: notes.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 주유 (법인) — 모두 필수 */}
          {form.type === "주유" && (
            <FuelFields form={form} setField={setField} tone="company" title="⛽ 주유 정보" required />
          )}

          {/* 개인주유 — 선택 입력 */}
          {form.type === "개인주유" && (
            <FuelFields form={form} setField={setField} tone="personal" title="⛽ 개인 주유" />
          )}

          {/* 개인 사용 */}
          {form.type === "개인사용" && (
            <MeterField
              form={form}
              setField={setField}
              meter={meter}
              previewLabel="개인 운행거리"
              previewTone="personal"
            />
          )}

          {/* 구분 - 맨 아래 (바꾸면 구분별 입력값은 비움) */}
          <div className="sl-field">
            <label>구분 *</label>
            <div className="sl-type-row">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`sl-type-btn${form.type === t ? " is-active" : ""}`}
                  style={{ "--type-color": TYPE_STYLE[t].color, "--type-bg": TYPE_STYLE[t].bg }}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      type: t,
                      destination: "",
                      // 업무로 바꾸면 출발/도착 시간을 지금 시각으로 다시 채움
                      departureTime: t === "업무" ? getKoreaTime() : "",
                      arrivalTime: t === "업무" ? getKoreaTime() : "",
                      fuelAmount: "",
                      fuelCost: "",
                      fuelUnitPrice: "",
                      meterReading: "",
                      // 비고도 비움 (업무가 아니면 화면에 안 보이는데 저장되던 문제)
                      notes: [{ content: "", time: "" }],
                      purpose: "",
                    }))
                  }
                >
                  {TYPE_ICON[t]}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="sl-field-error">⚠ {error}</p>}
          <div className="sl-modal-btns">
            <button type="button" className="sl-btn-outline" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="sl-btn-primary">
              {isEdit ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 도착지: 오전 / 오후 / 기타 (기타면 직접 입력 · 예전 기록의 다른 도착지도 기타로 보여줌)
function DestField({ form, setForm }) {
  const [custom, setCustom] = useState(
    !!form.destination && !HALF_DAYS.includes(form.destination),
  );
  const setDest = (destination) => setForm((f) => ({ ...f, destination }));
  return (
    <div className="sl-field">
      <label>도착지 *</label>
      <select
        value={custom ? "기타" : form.destination || ""}
        onChange={(e) => {
          const v = e.target.value;
          setCustom(v === "기타");
          setDest(v === "기타" ? "" : v);
        }}
        required
      >
        <option value="">선택</option>
        {HALF_DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value="기타">기타 (직접 입력)</option>
      </select>
      {custom && (
        <input
          type="text"
          className="sl-dest-custom"
          placeholder="도착지 입력"
          value={form.destination || ""}
          onChange={(e) => setDest(e.target.value)}
          required
          autoFocus
        />
      )}
    </div>
  );
}

// 미터기 칸 (업무 · 개인사용) + 운행거리 미리보기 + 범위 경고
function MeterField({ form, setField, meter, previewLabel, previewTone }) {
  const { lowerMeter, nextMeter, distPreview } = meter;
  return (
    <div className="sl-field">
      <label>
        미터기 (km) *
        {lowerMeter > 0 && (
          <span className="sl-meter-range">
            기준: {fmt(lowerMeter)}km 이상
            {nextMeter > 0 && ` ~ ${fmt(nextMeter)}km 이하`}
          </span>
        )}
      </label>
      <div className="sl-unit-input">
        <input
          type="number"
          placeholder="계량기 숫자"
          value={form.meterReading || ""}
          onChange={setField("meterReading")}
          required
        />
        <span className="sl-unit">km</span>
      </div>
      {distPreview !== null && distPreview >= 0 && (
        <p className={`sl-hint ${previewTone === "personal" ? "is-personal" : "is-info"}`}>
          {previewLabel}: {fmt(distPreview)}km
        </p>
      )}
      {meter.tooLow && (
        <p className="sl-hint is-error">⚠ 이전 미터기({fmt(lowerMeter)}km)보다 낮습니다!</p>
      )}
      {meter.tooHigh && (
        <p className="sl-hint is-error">⚠ 이후 날짜 미터기({fmt(nextMeter)}km)보다 큽니다!</p>
      )}
    </div>
  );
}

// 주유량 · 주유금액 · 단가 (주유 = 법인, 개인주유 = 개인)
function FuelFields({ form, setField, tone, title, required }) {
  const mark = required ? " *" : "";
  const fields = [
    { key: "fuelAmount", label: "주유량", unit: "L", placeholder: "48.13", step: "0.01" },
    { key: "fuelCost", label: "주유금액", unit: "원", placeholder: "52000" },
    { key: "fuelUnitPrice", label: "단가", unit: "원", placeholder: "1615" },
  ];
  return (
    <div className={`sl-fuel-box is-${tone}`}>
      <p className="sl-fuel-title">{title}</p>
      <div className="sl-grid-3">
        {fields.map((f) => (
          <div key={f.key} className="sl-field">
            <label>{f.label + mark}</label>
            <div className="sl-unit-input is-compact">
              <input
                type="number"
                step={f.step}
                placeholder={f.placeholder}
                value={form[f.key] || ""}
                onChange={setField(f.key)}
                required={required}
              />
              <span className="sl-unit">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
