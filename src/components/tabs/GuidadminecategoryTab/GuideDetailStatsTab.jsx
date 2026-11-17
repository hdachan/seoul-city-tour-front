// 🔎 가이드 상세 통계 (관리자, 조회만): 장부와 대조하는 화면
// 장부 맞추는 순서대로
//   ① 가이드 카드 (한 달 합계) → 누르면
//   ② 그 가이드의 달력 (날마다 현금 · 카드 · 지출 · 토탈) → 날짜 누르면
//   ③ 달력 아래에 그날 대표자 한 줄씩 (넣은 순서) + 지출 · 일비
// 금액 기준은 세 단계 모두 같음 (달력 날짜를 다 더하면 ① 카드 금액)
import { useEffect, useMemo, useState } from "react";
import { fetchAdminDetailStats } from "../../../api/auth";
import { optionLabel } from "../IncomeOptions";
import { expenseUnit } from "../../../utils/expenseUnit";
import {
  WEEKDAYS,
  calendarWeeks,
  dateLabel,
  dayStatus,
  guideRows,
  headcountText,
  onlyDate,
  onlyGuide,
  optionGroups,
  search,
  totals,
  wanbulOf,
} from "./guideDetailStats";
import "./GuideDetailStatsTab.css";

const won = (n) => `${Number(n || 0).toLocaleString()}원`;
const n0 = (n) => Number(n || 0).toLocaleString();

// 합계 칸 (0원인 칸은 숨김, 현금 · 카드 · 토탈은 항상)
function SumChips({ t }) {
  const items = [
    ["현금", t.cash, "is-cash", true],
    ["카드", t.card, "is-card", true],
    ["옵션 현금", t.optCash, "is-opt"],
    ["옵션 카드", t.optCard, "is-opt"],
    ["완불", t.wanbul, "is-wanbul"],
    ["지출 (현금)", t.expCash, "is-exp", true],
    ["지출 (카드)", t.expCard, "is-exp"],
    ["일비", t.dailyFee, "is-fee"],
  ].filter(([, v, , always]) => always || v);
  return (
    <div className="gds-chips">
      <span className="gds-chip">
        <span>수입</span>
        <b>
          {t.count}건 · {t.headcount}명
        </b>
      </span>
      {items.map(([label, v, cls]) => (
        <span key={label} className="gds-chip">
          <span>{label}</span>
          <b className={cls}>{won(v)}</b>
        </span>
      ))}
      <span className="gds-chip is-total">
        <span>토탈 (현금 − 지출 현금)</span>
        <b className={t.net < 0 ? "minus" : ""}>{won(t.net)}</b>
      </span>
    </div>
  );
}

// 수입 한 건의 받은 돈 글자
function moneyText(i) {
  const p = i.paymentType;
  if (p === "그외-교차") return `현금 ${n0(i.cashIn)} + 카드 ${n0(i.cardIn)}`;
  if (p === "완불") return wanbulOf(i) ? `완불 ${n0(wanbulOf(i))}` : "완불";
  if (i.cashIn) return `현금 ${n0(i.cashIn)}`;
  if (i.cardIn) return `카드 ${n0(i.cardIn)}`;
  return "금액 없음";
}

const payClass = (p) =>
  p === "현금" || p === "그외-현금"
    ? "is-cash"
    : p === "카드" || p === "그외-카드"
    ? "is-card"
    : p === "완불"
    ? "is-wanbul"
    : "is-etc";

// ① 가이드 카드 안 미니 달력: 날짜별로 입력이 있었는지 색으로
const STATUS_TEXT = { income: "수입 입력", other: "지출 · 일비만", none: "입력 없음", future: "" };
function MiniCal({ part, year, month, today }) {
  return (
    <div className="gds-mini">
      {WEEKDAYS.map((w, i) => (
        <span key={w} className={`gds-mini-w ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
          {w}
        </span>
      ))}
      {calendarWeeks(year, month)
        .flat()
        .map((d, k) => {
          if (!d) return <span key={k} />;
          const s = dayStatus(part, d, today);
          return (
            <span
              key={d}
              className={`gds-mini-d is-${s} ${d === today ? "is-today" : ""}`}
              title={`${dateLabel(d)} ${STATUS_TEXT[s]}`}
            >
              {Number(d.slice(8))}
            </span>
          );
        })}
    </div>
  );
}

function MiniLegend() {
  return (
    <div className="gds-legend">
      <span>
        <i className="gds-mini-d is-income" /> 수입 입력한 날
      </span>
      <span>
        <i className="gds-mini-d is-other" /> 지출 · 일비만
      </span>
      <span>
        <i className="gds-mini-d is-none" /> 입력 없음
      </span>
    </div>
  );
}

// ③ 그날 상세 – 보기: 전체 / 수입 / 옵션 / 지출 / 일비
const DAY_VIEWS = ["전체", "수입", "옵션", "지출", "일비"];

function IncomeList({ incomes }) {
  if (incomes.length === 0) return <div className="gds-empty">수입 없음</div>;
  return (
    <div className="gds-list">
      {incomes.map((i, idx) => (
        <div key={i.id} className="gds-item">
          <span className="gds-no">{idx + 1}</span>
          <div className="gds-item-body">
            <div className="gds-item-main">
              <b className="gds-rep">{i.representativeName || "(이름 없음)"}</b>
              <span className="gds-meta">
                {i.tourName} · {headcountText(i)}
              </span>
              <span className={`gds-pay ${payClass(i.paymentType)}`}>{i.paymentType}</span>
              <b className="gds-money">{moneyText(i)}</b>
            </div>
            {((i.options || []).length > 0 || i.note || i.memo) && (
              <div className="gds-item-sub">
                {(i.options || []).map((o, k) => (
                  <span key={k} className="gds-opt">
                    🎟 {optionLabel(o)}
                  </span>
                ))}
                {[i.note, i.memo].filter(Boolean).length > 0 && (
                  <span className="gds-memo">📝 {[i.note, i.memo].filter(Boolean).join(" · ")}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionList({ incomes }) {
  const groups = optionGroups(incomes);
  if (groups.length === 0) return <div className="gds-empty">옵션 없음</div>;
  return (
    <div className="gds-list">
      {groups.map((g) => (
        <div key={g.name} className="gds-group">
          <div className="gds-group-head">
            <b>🎟 {g.name}</b>
            <span className="gds-meta">{g.count}건</span>
            <span className="gds-group-sum">
              {g.cash > 0 && <b className="is-cash">현금 {n0(g.cash)}</b>}
              {g.card > 0 && <b className="is-card">카드 {n0(g.card)}</b>}
            </span>
          </div>
          {g.rows.map((r, k) => (
            <div key={k} className="gds-group-row">
              <span className="gds-no is-small">{r.no}</span>
              <span className="gds-rep-sm">{r.rep || "(이름 없음)"}</span>
              <span className="gds-money-sm">
                {r.option.paymentType === "교차"
                  ? `현금 ${n0(r.option.cashAmount)} + 카드 ${n0(r.option.cardAmount)}`
                  : `${r.option.paymentType || ""} ${n0(r.option.amount)}`}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ExpenseList({ expenses }) {
  if (expenses.length === 0) return <div className="gds-empty">지출 없음</div>;
  return (
    <div className="gds-list">
      {expenses.map((e) => (
        <div key={e.id} className="gds-item is-exp-row">
          <div className="gds-item-main">
            <b className="gds-rep">{e.expenseType}</b>
            <span className="gds-meta">
              {e.tourName || "-"} · {n0(e.amount)} × {e.headcount}
              {expenseUnit(e.expenseType)}
            </span>
            <span className={`gds-pay ${e.paymentType === "현금" ? "is-cash" : "is-card"}`}>{e.paymentType}</span>
            <b className="gds-money is-exp">{won(e.totalAmount)}</b>
          </div>
          {e.memo && <div className="gds-item-sub gds-memo">📝 {e.memo}</div>}
        </div>
      ))}
    </div>
  );
}

function FeeList({ dailyFees }) {
  if (dailyFees.length === 0) return <div className="gds-empty">일비 없음</div>;
  return (
    <div className="gds-list">
      {dailyFees.map((d) => (
        <div key={d.id} className="gds-item is-exp-row">
          <div className="gds-item-main">
            <b className="gds-rep">일비</b>
            <b className="gds-money is-fee">{won(d.amount)}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

function DayDetail({ day, date, guideName, view, onView }) {
  const t = totals(day);
  const incomes = [...day.incomes].sort((a, b) => a.id - b.id);
  const optCount = incomes.reduce((s, i) => s + (i.options || []).length, 0);
  const counts = {
    전체: null,
    수입: `${incomes.length}건`,
    옵션: `${optCount}건`,
    지출: `${day.expenses.length}건`,
    일비: `${day.dailyFees.length}건`,
  };
  const icons = { 전체: "📋", 수입: "💰", 옵션: "🎟", 지출: "💸", 일비: "🧾" };
  // 보기별 합계 한 줄
  const sumLine = {
    수입: `현금 ${n0(t.cash)} · 카드 ${n0(t.card)}${t.wanbul ? ` · 완불 ${n0(t.wanbul)}` : ""}`,
    옵션: `옵션 현금 ${n0(t.optCash)} · 옵션 카드 ${n0(t.optCard)}`,
    지출: `지출 (현금) ${n0(t.expCash)} · 지출 (카드) ${n0(t.expCard)}`,
    일비: `일비 ${n0(t.dailyFee)}`,
  }[view];
  const show = (v) => view === "전체" || view === v;
  return (
    <div className="gds-box gds-detail">
      <div className="gds-detail-title">
        📅 {dateLabel(date)} · {guideName}
      </div>
      <div className="gds-views">
        {DAY_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            className={`gds-view ${view === v ? "on" : ""}`}
            onClick={() => onView(v)}
          >
            {icons[v]} {v}
            {counts[v] && <span className="gds-view-count">{counts[v]}</span>}
          </button>
        ))}
      </div>

      {view === "전체" ? <SumChips t={t} /> : <div className="gds-sumline">합계 · {sumLine}</div>}

      {show("수입") && (
        <>
          {view === "전체" && <div className="gds-sub">💰 수입 {incomes.length}건 (넣은 순서)</div>}
          <IncomeList incomes={incomes} />
        </>
      )}
      {view === "옵션" && <OptionList incomes={incomes} />}
      {show("지출") && (
        <>
          {view === "전체" && <div className="gds-sub">💸 지출 {day.expenses.length}건</div>}
          <ExpenseList expenses={day.expenses} />
        </>
      )}
      {show("일비") && (
        <>
          {view === "전체" && <div className="gds-sub">🧾 일비</div>}
          <FeeList dailyFees={day.dailyFees} />
        </>
      )}
    </div>
  );
}

export default function GuideDetailStatsTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState({ guides: [], incomes: [], expenses: [], dailyFees: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState(null); // { username, name }
  const [date, setDate] = useState(null);
  const [q, setQ] = useState("");
  const [view, setView] = useState("전체"); // ③ 보기 (날짜를 바꿔도 유지)

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchAdminDetailStats(year, month)
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setError("데이터를 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [year, month]);

  const nameOf = (u) => data.guides.find((g) => g.username === u)?.name || u;
  const gRows = useMemo(() => guideRows(data), [data]);
  const part = useMemo(() => (guide ? onlyGuide(data, guide.username) : null), [data, guide]);
  const hits = useMemo(() => search(data, q), [data, q]);

  const goMonth = () => {
    setGuide(null);
    setDate(null);
  };
  const pickGuide = (g) => {
    setGuide(g);
    setDate(null);
  };
  const goHit = (r) => {
    setGuide({ username: r.guideUsername, name: nameOf(r.guideUsername) });
    setDate(r.date);
    setQ("");
  };
  const changeYM = (setter) => (e) => {
    setter(Number(e.target.value));
    goMonth();
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return (
    <div className="gds">
      {/* 년월 · 검색 */}
      <div className="gds-top">
        <select value={year} onChange={changeYM(setYear)} aria-label="년">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <select value={month} onChange={changeYM(setMonth)} aria-label="월">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="🔍 대표자 이름 · 비고로 찾기"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="검색"
        />
        {loading && <span className="zero">불러오는 중…</span>}
      </div>

      {error && (
        <div className="alert alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}

      {/* 검색 결과 */}
      {q.trim() && (
        <div className="gds-box">
          <div className="gds-sub" style={{ marginTop: 0 }}>
            🔍 "{q.trim()}" 찾은 결과 {hits.incomes.length + hits.expenses.length}건 – 누르면 그 날짜로 가요
          </div>
          <div className="gds-hits">
            {hits.incomes.length + hits.expenses.length === 0 && <span className="zero">없음</span>}
            {hits.incomes.map((i) => (
              <button key={`i${i.id}`} type="button" className="gds-hit" onClick={() => goHit(i)}>
                <b>{dateLabel(i.date)}</b> · {nameOf(i.guideUsername)} · {i.representativeName || "-"} · {i.tourName} ·{" "}
                {i.paymentType}
              </button>
            ))}
            {hits.expenses.map((e) => (
              <button key={`e${e.id}`} type="button" className="gds-hit" onClick={() => goHit(e)}>
                <b>{dateLabel(e.date)}</b> · {nameOf(e.guideUsername)} · 지출 {e.expenseType}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ① 가이드 카드 */}
      {!guide && (
        <>
          <p className="gds-help">① 맞춰 볼 가이드를 누르세요.</p>
          <MiniLegend />
          <div className="gds-cards">
            {gRows.map((r) => (
              <button
                key={r.username}
                type="button"
                className={`gds-gcard ${r.days ? "" : "is-empty"}`}
                onClick={() => pickGuide({ username: r.username, name: r.name })}
              >
                <div className="gds-gname">{r.name}</div>
                {r.days ? (
                  <>
                    <div className="gds-gsub">
                      {r.days}일 근무 · 수입 {r.t.count}건
                    </div>
                    <div className="gds-gline">
                      <span>현금</span>
                      <b className="is-cash">{won(r.t.cash)}</b>
                    </div>
                    <div className="gds-gline">
                      <span>카드</span>
                      <b className="is-card">{won(r.t.card)}</b>
                    </div>
                    {r.t.optCash > 0 && (
                      <div className="gds-gline">
                        <span>옵션 현금</span>
                        <b className="is-opt">{won(r.t.optCash)}</b>
                      </div>
                    )}
                    {r.t.optCard > 0 && (
                      <div className="gds-gline">
                        <span>옵션 카드</span>
                        <b className="is-opt">{won(r.t.optCard)}</b>
                      </div>
                    )}
                    <div className="gds-gline">
                      <span>지출 (현금)</span>
                      <b className="is-exp">{won(r.t.expCash)}</b>
                    </div>
                    <div className="gds-gline is-total">
                      <span>토탈</span>
                      <b className={r.t.net < 0 ? "minus" : ""}>{won(r.t.net)}</b>
                    </div>
                  </>
                ) : (
                  <div className="gds-gsub">이번 달 입력 없음</div>
                )}
                <MiniCal part={onlyGuide(data, r.username)} year={year} month={month} today={today} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* ② 가이드 달력 */}
      {guide && (
        <>
          <div className="gds-guidebar">
            <button type="button" className="gds-back" onClick={goMonth}>
              ← 가이드 목록
            </button>
            <b>
              {guide.name} · {year}년 {month}월
            </b>
          </div>
          <div className="gds-box">
            <SumChips t={totals(part)} />
          </div>
          <p className="gds-help">② 장부와 금액이 다른 날짜를 누르면 아래에 대표자별로 나와요.</p>
          <div className="gds-cal-wrap">
            <table className="gds-cal">
              <thead>
                <tr>
                  {WEEKDAYS.map((w, i) => (
                    <th key={w} className={i === 0 ? "sun" : i === 6 ? "sat" : ""}>
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarWeeks(year, month).map((week, wi) => (
                  <tr key={wi}>
                    {week.map((d, di) => {
                      if (!d) return <td key={di} className="empty" />;
                      const day = onlyDate(part, d);
                      const has = day.incomes.length + day.expenses.length + day.dailyFees.length > 0;
                      const t = totals(day);
                      return (
                        <td
                          key={d}
                          className={`${has ? "has" : "off"} ${d === date ? "selected" : ""}`}
                          onClick={() => has && setDate(d === date ? null : d)}
                        >
                          <div className={`gds-dnum ${di === 0 ? "sun" : di === 6 ? "sat" : ""}`}>
                            {Number(d.slice(8))}
                            {has && <span className="gds-dcount">{t.count}건</span>}
                          </div>
                          {has && (
                            <div className="gds-dlines">
                              <div>
                                <span>현금</span>
                                <b className="is-cash">{n0(t.cash)}</b>
                              </div>
                              <div>
                                <span>카드</span>
                                <b className="is-card">{n0(t.card)}</b>
                              </div>
                              {t.optCash > 0 && (
                                <div>
                                  <span>옵션현금</span>
                                  <b className="is-opt">{n0(t.optCash)}</b>
                                </div>
                              )}
                              {t.optCard > 0 && (
                                <div>
                                  <span>옵션카드</span>
                                  <b className="is-opt">{n0(t.optCard)}</b>
                                </div>
                              )}
                              <div>
                                <span>지출</span>
                                <b className="is-exp">{n0(t.expCash)}</b>
                              </div>
                              <div className="is-total">
                                <span>토탈</span>
                                <b className={t.net < 0 ? "minus" : ""}>{n0(t.net)}</b>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gds-note">
            현금 · 카드 = 투어 금액만 · 옵션현금 / 옵션카드 = 그날 옵션 (있는 날만) · 지출 = 현금 지출 · 토탈 = 현금 − 지출
          </p>

          {/* ③ 그날 상세 */}
          {date && <DayDetail day={onlyDate(part, date)} date={date} guideName={guide.name} view={view} onView={setView} />}
        </>
      )}
    </div>
  );
}
