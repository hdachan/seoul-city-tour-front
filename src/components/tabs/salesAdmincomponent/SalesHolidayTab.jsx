// 🏖 영업 휴무 (영업 사원 본인): 쉬는 날(기간)과 사유를 적음
// 표시만 하는 용도 – 운행 입력을 막지 않음. 적은 날은 📈 영업 정산 통계에 휴무 색으로 나옴
// 기간 고르기: ① 달력에서 끌기(드래그) ② 시작 날 → 끝나는 날 차례로 누르기 ③ 기간 칸에 직접 입력
// 서버에는 하루 한 줄로 저장, 화면에서는 연달아 같은 사유인 날을 한 띠로 이어서 보여 줌
import { useCallback, useEffect, useRef, useState } from "react";
import { salesHolidayApi as api } from "../../../api/sales";
import { toDateStr } from "../../../utils/dateUtils";
import { WEEKDAYS, calendarWeeks } from "../GuidadminecategoryTab/guideDetailStats";
import {
  MAX_HOLIDAY_DAYS,
  dayCount,
  holidayRange,
  holidayRuns,
  periodLabel,
  runByDate,
  savePlan,
} from "./salesHoliday";
import "./SalesHolidayTab.css";

const sortPair = (a, b) => (a <= b ? [a, b] : [b, a]);

export default function SalesHolidayTab() {
  const now = new Date();
  const today = toDateStr(now);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [list, setList] = useState([]); // [{ date, reason }]
  // 입력 창: null | { mode: "new" | "edit", start, end, reason, orig: [고치기 전 날짜] }
  const [form, setForm] = useState(null);
  const [dragSel, setDragSel] = useState(null); // 끄는 중인 기간 [a, b]
  const dragRef = useRef(null); // { anchor, current, mouse }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    setError("");
    return api
      .getMine(year, month)
      .then((r) => setList(r.data || []))
      .catch(() => setError("휴무를 불러오지 못했습니다."));
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const runs = holidayRuns(list);
  const byDate = runByDate(runs);
  const monthDays = list.length;

  const openNew = (start, end, keepReason = true) => {
    setError("");
    setSuccess("");
    setForm((f) => ({
      mode: "new",
      start,
      end,
      reason: keepReason && f?.mode === "new" ? f.reason : "",
      orig: [],
    }));
  };
  const openEdit = (run) => {
    setError("");
    setSuccess("");
    setForm({ mode: "edit", start: run.start, end: run.end, reason: run.reason, orig: run.days });
  };

  // 날짜 한 번 누름
  const tap = (d) => {
    const hit = byDate[d];
    if (hit) return openEdit(hit.run);
    // 시작 날만 고른 상태에서 다른 날을 누르면 → 그 날까지 기간으로
    if (form?.mode === "new" && form.start === form.end && d !== form.start) {
      const [s, e] = sortPair(form.start, d);
      return setForm({ ...form, start: s, end: e });
    }
    openNew(d, d, false);
  };

  // 끌기 끝: 같은 칸이면 누름, 다른 칸이면 기간
  const finishRef = useRef(null);
  finishRef.current = (a, b) => {
    if (a === b) tap(a);
    else {
      const [s, e] = sortPair(a, b);
      openNew(s, e, true);
    }
  };
  useEffect(() => {
    const up = () => {
      const g = dragRef.current;
      if (!g) return;
      dragRef.current = null;
      setDragSel(null);
      finishRef.current(g.anchor, g.current);
    };
    // 휴대폰에서 누른 채 화면을 밀면(스크롤) 고르기 취소
    const cancel = () => {
      dragRef.current = null;
      setDragSel(null);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  const onDown = (d) => (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.pointerType === "mouse") e.preventDefault(); // 글자 선택 막기
    dragRef.current = { anchor: d, current: d, mouse: e.pointerType === "mouse" };
    setDragSel([d, d]);
  };
  const onEnter = (d) => () => {
    const g = dragRef.current;
    if (!g || !g.mouse) return;
    g.current = d;
    setDragSel(sortPair(g.anchor, d));
  };

  const moveMonth = (diff) => {
    const d = new Date(year, month - 1 + diff, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };
  const addButton = () => {
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    const d = today.startsWith(ym) ? today : `${ym}-01`;
    openNew(d, d, false);
  };

  // 입력 창 값
  const [fs, fe] = form ? sortPair(form.start || form.end, form.end || form.start) : [null, null];
  const validDates = !!(form && fs && fe);
  const count = validDates ? dayCount(fs, fe) : 0;
  const overlap = validDates
    ? holidayRange(fs, fe).filter((d) => byDate[d] && !form.orig.includes(d)).length
    : 0;

  const save = async () => {
    if (!validDates) return setError("기간을 골라주세요.");
    if (count > MAX_HOLIDAY_DAYS) return setError(`휴무 기간은 ${MAX_HOLIDAY_DAYS}일까지 한 번에 적을 수 있습니다.`);
    const reason = form.reason.trim();
    if (!reason) return setError("휴무 사유를 적어주세요.");
    setSaving(true);
    setError("");
    try {
      const plan = savePlan(fs, fe, form.orig);
      for (const d of plan.remove) await api.remove(d);
      for (const d of plan.save) await api.save(d, reason);
      setSuccess(`${periodLabel(fs, fe)}${count > 1 ? ` (${count}일)` : ""} 휴무를 저장했습니다.`);
      setForm(null);
    } catch (e) {
      setError(e.response?.data?.error || "저장하지 못했습니다.");
    } finally {
      setSaving(false);
      load();
    }
  };

  const removeRun = async () => {
    const label = periodLabel(form.orig[0], form.orig[form.orig.length - 1]);
    if (!window.confirm(`${label} 휴무${form.orig.length > 1 ? ` ${form.orig.length}일` : ""}를 취소할까요?`)) return;
    setSaving(true);
    try {
      for (const d of form.orig) await api.remove(d);
      setSuccess(`${label} 휴무를 취소했습니다.`);
      setForm(null);
    } catch (e) {
      setError(e.response?.data?.error || "취소하지 못했습니다.");
    } finally {
      setSaving(false);
      load();
    }
  };

  // 달력에 칠할 기간: 끄는 중이면 그 기간, 아니면 입력 창 기간
  const sel = dragSel || (validDates ? [fs, fe] : null);
  const inSel = (d) => sel && d >= sel[0] && d <= sel[1];

  return (
    <div className="shd">
      <div className="shd-top">
        <button type="button" className="shd-nav" onClick={() => moveMonth(-1)} aria-label="이전 달">
          ◀
        </button>
        <b className="shd-ym">
          {year}년 {month}월
        </b>
        <button type="button" className="shd-nav" onClick={() => moveMonth(1)} aria-label="다음 달">
          ▶
        </button>
        <span className="shd-count">
          이번 달 휴무 <b>{monthDays}일</b>
        </span>
        <button type="button" className="sl-btn-primary" onClick={addButton}>
          ＋ 휴무 추가
        </button>
      </div>

      {error && (
        <div className="sl-alert sl-alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="sl-alert sl-alert-success" onClick={() => setSuccess("")}>
          ✅ {success}
        </div>
      )}

      <div className="shd-help">
        <span>🖱 쉬는 날을 <b>끌어서</b> 기간 고르기</span>
        <span>👆 <b>시작 날 → 끝나는 날</b> 차례로 누르기</span>
        <span>🏖 보라색 휴무를 누르면 고치기 · 취소</span>
      </div>

      <div className="shd-cal">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`shd-w ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
            {w}
          </div>
        ))}
        {calendarWeeks(year, month)
          .flat()
          .map((d, k) => {
            if (!d) return <div key={k} className="shd-d is-blank" />;
            const dow = k % 7;
            const hit = byDate[d];
            const showLabel = hit && (hit.pos === "start" || hit.pos === "single" || dow === 0 || d.endsWith("-01"));
            return (
              <div
                key={d}
                data-date={d}
                role="button"
                tabIndex={0}
                aria-label={hit ? `${periodLabel(d, d)} 휴무: ${hit.run.reason}` : periodLabel(d, d)}
                className={`shd-d ${hit ? "is-off" : ""} ${inSel(d) ? "is-sel" : ""} ${d === today ? "is-today" : ""}`}
                onPointerDown={onDown(d)}
                onPointerEnter={onEnter(d)}
                onKeyDown={(e) => e.key === "Enter" && tap(d)}
                title={hit ? `${periodLabel(hit.run.start, hit.run.end)} 휴무: ${hit.run.reason}` : undefined}
              >
                <span className={`shd-num ${dow === 0 ? "sun" : dow === 6 ? "sat" : ""}`}>{Number(d.slice(8))}</span>
                {hit && (
                  <span
                    className={`shd-band pos-${hit.pos} ${dow === 0 ? "row-start" : ""} ${dow === 6 ? "row-end" : ""}`}
                  >
                    {showLabel && (
                      <>
                        🏖 {hit.run.reason}
                        {hit.run.days.length > 1 && hit.pos === "start" ? ` · ${hit.run.days.length}일` : ""}
                      </>
                    )}
                  </span>
                )}
              </div>
            );
          })}
      </div>

      {form && (
        <div className="shd-form">
          <div className="shd-form-title">{form.mode === "edit" ? "🏖 휴무 고치기" : "🏖 휴무 적기"}</div>
          <div className="shd-period">
            <span className="shd-label">기간</span>
            <input
              type="date"
              aria-label="시작 날"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
            <span>~</span>
            <input
              type="date"
              aria-label="끝나는 날"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
            {validDates && <b className="shd-days">{count}일</b>}
          </div>
          {validDates && <div className="shd-period-text">{periodLabel(fs, fe)}</div>}
          {form.mode === "new" && form.start === form.end && (
            <div className="shd-tip">💡 달력에서 다른 날을 누르면 그 날까지 기간으로 늘어나요.</div>
          )}
          {overlap > 0 && (
            <div className="shd-warn">⚠ 이미 적은 휴무 {overlap}일이 이 사유로 바뀝니다.</div>
          )}
          <textarea
            className="shd-input"
            rows={2}
            maxLength={500}
            placeholder="휴무 사유 (예: 개인 사정, 병원, 가족 여행)"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <div className="shd-btns">
            <button type="button" className="sl-btn-primary" onClick={save} disabled={saving}>
              {saving ? "저장 중…" : count > 1 ? `${count}일 휴무 저장` : "휴무 저장"}
            </button>
            {form.mode === "edit" && (
              <button type="button" className="shd-btn-del" onClick={removeRun} disabled={saving}>
                휴무 취소{form.orig.length > 1 ? ` (${form.orig.length}일)` : ""}
              </button>
            )}
            <button type="button" className="sl-btn-outline" onClick={() => setForm(null)} disabled={saving}>
              닫기
            </button>
          </div>
        </div>
      )}

      <div className="shd-list-box">
        <div className="shd-list-title">🏖 {month}월 휴무 목록</div>
        {runs.length === 0 ? (
          <div className="shd-empty">적은 휴무가 없습니다.</div>
        ) : (
          runs.map((r) => (
            <button key={r.start} type="button" className="shd-row" onClick={() => openEdit(r)}>
              <b>{periodLabel(r.start, r.end)}</b>
              {r.days.length > 1 && <em>{r.days.length}일</em>}
              <span>{r.reason}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
