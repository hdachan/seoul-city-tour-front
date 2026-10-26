import { useEffect, useState, useRef, useCallback } from "react";
import { toDateStr } from "../../../utils/dateUtils";
import useToday from "../../../utils/useToday";
import "./sales.css";
import { salesApi as api } from "../../../api/sales";
import { formatDrivingTime } from "./DrivingTimeFields";
import SalesMonthlyStats from "./SalesMonthlyStats";
import ReceiptModal from "./ReceiptModal";
import DrivingModal from "./DrivingModal";
import StartMeterModal from "./StartMeterModal";
import {
  downloadDrivingExcel as exportDrivingExcel,
  printDriving as exportPrintDriving,
  downloadReceiptExcel as exportReceiptExcel,
  printReceipt as exportPrintReceipt,
} from "./salesExport";
import {
  fmt,
  fmtWon,
  pad2,
  TYPE_STYLE,
  getWeeksOfMonth,
  calcDistances,
  getKoreaTime,
  sumDist,
} from "./salesShared";

// 기준일(YYYY-MM-DD)이 속한 주의 월요일 / 일요일
const getWeekMonday = (dateStr) => {
  const [y, m, dd] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, dd);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return toDateStr(d);
};
const getWeekSunday = (dateStr) => {
  const [y, m, dd] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, dd);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return toDateStr(d);
};

export default function SalesContent() {
  const now = new Date();
  // 오늘 / 이번 주 (화면을 켜둔 채 자정이 지나면 자동 갱신)
  const TODAY = useToday();
  const THIS_WEEK_MONDAY = getWeekMonday(TODAY);
  const THIS_WEEK_SUNDAY = getWeekSunday(TODAY);
  const username = sessionStorage.getItem("username");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mainTab, setMainTab] = useState("driving");

  const [isLocked, setIsLocked] = useState(false);
  const [weekLocks, setWeekLocks] = useState({}); // ← 이 줄 추가
  const [myCard, setMyCard] = useState("");
  const [categories, setCategories] = useState([]);
  const [expandedNotes, setExpandedNotes] = useState({}); // 모바일 비고 펼치기
  const [destinations, setDestinations] = useState([]);
  const [destSearch, setDestSearch] = useState("");
  const [showDestDrop, setShowDestDrop] = useState(false);
  const destRef = useRef(null);
  const [monthDriving, setMonthDriving] = useState([]);
  const [monthStartMeter, setMonthStartMeter] = useState(0); // 지난달 마지막 미터기
  const [receipts, setReceipts] = useState([]);

  // 선택 날짜 관련
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [dayDriving, setDayDriving] = useState([]);
  const [prevMeter, setPrevMeter] = useState(0);
  const [lastMeter, setLastMeter] = useState(0); // 오늘 마지막 미터기 (추가 시 기준)
  const [dailyNote, setDailyNote] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const [drivingForm, setDrivingForm] = useState({
    date: TODAY,
    type: "업무",
    destination: "",
    departureTime: "",
    arrivalTime: getKoreaTime(),
    meterReading: "",
    purpose: "",
    notes: [{ content: "", time: "" }],
    fuelAmount: "",
    fuelCost: "",
    fuelUnitPrice: "",
  });
  const [receiptForm, setReceiptForm] = useState({
    date: TODAY,
    category: "",
    content: "",
    amount: "",
    businessNumber: "",
    companyName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // 처음 쓰는 사람: 시작 미터기 입력 전까지 화면 막음
  const [needStartMeter, setNeedStartMeter] = useState(false);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // 날짜 드롭다운 목록 (이번 달 날짜들)
  const dateOptions = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${year}-${pad2(month)}-${pad2(i + 1)}`;
    return d;
  });

  // 월요일 기준 주 계산
  // 날짜 문자열을 로컬 시간으로 파싱 (UTC 문제 방지)
  const parseLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // 선택 날짜가 속한 주 번호 (로컬 시간 기준)
  const getWeekNumForDate = (dateStr) => {
    const d = parseLocalDate(dateStr);
    const weeks = getWeeksOfMonth(d.getFullYear(), d.getMonth() + 1);
    for (const w of weeks) {
      if (d >= w.start && d <= w.end) return w.weekNum;
    }
    return -1;
  };

  // 선택 날짜 주 번호
  const selectedWeekNum = getWeekNumForDate(selectedDate);

  // DB weekLocks 기준으로만 체크 (스케줄러가 이번주=false, 지난주=true 관리)
  const isWeekLocked = weekLocks[selectedWeekNum] === true;

  // 입력/수정 가능한 날짜인지 (운행일지 · 법인카드 · 비고 공통)
  // - 잠기지 않은 주 + 이번 주 일요일까지
  //   (이번 주는 스케줄러가 열어두고, 지난 주라도 관리자가 잠금을 풀면 입력 가능)
  // - 보고 있는 달이 아닌 날짜(이번 주가 두 달에 걸친 경우)는 이번 주만 허용
  //   (잠금 여부는 서버가 한 번 더 확인)
  const isDateEditable = (dateStr) => {
    if (!dateStr || dateStr > THIS_WEEK_SUNDAY) return false;
    if (dateStr.startsWith(`${year}-${pad2(month)}`))
      return !isLocked && weekLocks[getWeekNumForDate(dateStr)] === false;
    return dateStr >= THIS_WEEK_MONDAY;
  };
  const canEditDay = isDateEditable(selectedDate);

  const distPreview =
    drivingForm.meterReading && lastMeter
      ? parseInt(drivingForm.meterReading) - lastMeter
      : null;
  // 이후 날짜 중 가장 작은 미터기 (상한선)
  const nextMeter = (() => {
    const later = monthDriving
      .filter(
        (d) =>
          d.date > selectedDate &&
          d.meterReading > 0 &&
          (!editTarget || d.id !== editTarget.id),
      )
      .map((d) => d.meterReading);
    return later.length > 0 ? Math.min(...later) : 0;
  })();
  // 하한선: 추가는 오늘 마지막 미터기, 수정은 전일 미터기 기준
  const lowerMeter = editTarget ? prevMeter : lastMeter;
  const meterTooLow =
    drivingForm.meterReading &&
    lowerMeter > 0 &&
    parseInt(drivingForm.meterReading) < lowerMeter;
  const meterTooHigh =
    drivingForm.meterReading &&
    nextMeter > 0 &&
    parseInt(drivingForm.meterReading) > nextMeter;

  const enteredDates = new Set(monthDriving.map((d) => d.date));

  const loadMonth = useCallback(async () => {
    try {
      const [lock, drv, rec, cats, card] = await Promise.all([
        api.getLockStatus(year, month),
        api.getDriving(year, month),
        api.getReceipts(year, month),
        api.getCategories(),
        api.getMyCard(),
      ]);
      setIsLocked(lock.data.locked);
      setWeekLocks(lock.data.weekLocks || {});
      setMonthDriving(drv.data);
      setReceipts(rec.data);
      setCategories(cats.data);
      setMyCard(card.data.cardNumber);
      // 지난달 마지막 미터기 (엑셀·인쇄 첫 운행거리용) - 실패해도 전체 영향 없음
      api
        .getPrevMeter(`${year}-${pad2(month)}-01`)
        .then((r) => setMonthStartMeter(r.data.prevMeter || 0))
        .catch(() => setMonthStartMeter(0));
      // destinations는 별도 로드 (실패해도 전체 영향 없음)
      api
        .getDestinations()
        .then((r) => setDestinations(r.data))
        .catch(() => {});
    } catch {
      setError("데이터를 불러오지 못했습니다.");
    }
  }, [year, month]);

  const loadDay = useCallback(async () => {
    try {
      const [day, prev, note] = await Promise.all([
        api.getDrivingDate(selectedDate),
        api.getPrevMeter(selectedDate),
        api.getDailyNote(selectedDate),
      ]);
      setDayDriving(day.data);
      setPrevMeter(prev.data.prevMeter);
      setDailyNote(note.data.note || "");
      setNoteInput(note.data.note || "");
      setNoteEditing(false);
      // 오늘 마지막 미터기 계산 (추가 시 기준)
      const todayMeters = day.data
        .map((d) => d.meterReading)
        .filter((m) => m > 0);
      setLastMeter(
        todayMeters.length > 0 ? Math.max(...todayMeters) : prev.data.prevMeter,
      );
    } catch {}
  }, [selectedDate]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);
  useEffect(() => {
    api
      .getStartMeter()
      .then((r) => setNeedStartMeter(!!r.data.needed))
      .catch(() => {});
  }, []);
  // 연/월을 바꾸면 선택 날짜도 그 달로 이동 (이번 달이면 오늘, 아니면 1일)
  useEffect(() => {
    const ym = `${year}-${pad2(month)}`;
    setSelectedDate((prev) =>
      prev.startsWith(ym)
        ? prev
        : TODAY.startsWith(ym)
          ? TODAY
          : `${ym}-01`,
    );
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps -- 연/월 변경 시에만 실행
  useEffect(() => {
    loadDay();
  }, [loadDay]);
  // 자정이 지나 날짜가 바뀌면: 오늘을 보고 있었으면 새 오늘로 이동,
  // 주 잠금은 스케줄러가 바꾸므로 월 데이터를 다시 불러옴
  const prevTodayRef = useRef(TODAY);
  useEffect(() => {
    const prev = prevTodayRef.current;
    if (prev === TODAY) return;
    prevTodayRef.current = TODAY;
    const [ty, tm] = TODAY.split("-").map(Number);
    const wasViewingToday =
      year === Number(prev.slice(0, 4)) && month === Number(prev.slice(5, 7));
    setSelectedDate((d) => (d === prev ? TODAY : d));
    if (wasViewingToday && (ty !== year || tm !== month)) {
      // 월이 넘어간 경우 (예: 31일 → 1일) 새 달로 이동 → loadMonth 자동 실행
      setYear(ty);
      setMonth(tm);
    } else {
      loadMonth();
      loadDay();
    }
  }, [TODAY]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(null);
      if (destRef.current && !destRef.current.contains(e.target))
        setShowDestDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSaveNote = async () => {
    if (!canEditDay) {
      setError("잠긴 날짜의 비고는 수정할 수 없습니다.");
      return;
    }
    setNoteSaving(true);
    try {
      await api.saveDailyNote(selectedDate, noteInput);
      setDailyNote(noteInput);
      setNoteEditing(false);
      setSuccess("비고가 저장되었습니다.");
    } catch (err) {
      setError(err.response?.data?.error || "저장 실패");
    }
    setNoteSaving(false);
  };

  // 운행일지 모달
  const openAdd = async () => {
    if (!canEditDay) {
      setError("잠긴 주입니다. 입력할 수 없습니다.");
      return;
    }
    setError("");
    setEditTarget(null);
    const prev = await api.getPrevMeter(selectedDate);
    setPrevMeter(prev.data.prevMeter);
    // 오늘 마지막 미터기 갱신
    const todayRes = await api.getDrivingDate(selectedDate);
    const todayMeters = todayRes.data
      .map((d) => d.meterReading)
      .filter((m) => m > 0);
    setLastMeter(
      todayMeters.length > 0 ? Math.max(...todayMeters) : prev.data.prevMeter,
    );
    setDrivingForm({
      startDate: selectedDate,
      endDate: "",
      type: "업무",
      destination: "",
      departureTime: getKoreaTime(),
      arrivalTime: getKoreaTime(),
      meterReading: "",
      fuelAmount: "",
      fuelCost: "",
      fuelUnitPrice: "",
    });
    setShowModal(true);
  };
  const openEdit = (row) => {
    setError("");
    setEditTarget(row);
    setOpenMenu(null);
    const notes =
      row.notes && row.notes.length > 0
        ? row.notes.map((n) => ({
            content: n.content || "",
            time: n.time || "",
          }))
        : row.purpose
          ? [{ content: row.purpose, time: "" }]
          : [{ content: "", time: "" }];
    setDrivingForm({
      startDate: row.date,
      endDate: "",
      type: row.type,
      destination: row.destination || "",
      departureTime: row.departureTime || "",
      arrivalTime: row.arrivalTime || "",
      meterReading: row.meterReading || "",
      purpose: row.purpose || "",
      notes,
      fuelAmount: row.fuelAmount || "",
      fuelCost: row.fuelCost || "",
      fuelUnitPrice: row.fuelUnitPrice || "",
    });
    setShowModal(true);
  };
  const handleSubmitDriving = async (e) => {
    e.preventDefault();
    setError("");
    if (!isDateEditable(drivingForm.startDate)) {
      setError("잠긴 주입니다. 입력할 수 없습니다.");
      return;
    }
    if (meterTooLow) {
      setError(`미터기는 ${fmt(lowerMeter)}km 이상이어야 합니다.`);
      return;
    }
    if (meterTooHigh) {
      setError(
        `이후 날짜에 ${fmt(nextMeter)}km 기록이 있어 그보다 클 수 없습니다.`,
      );
      return;
    }
    try {
      const payload = { ...drivingForm, date: drivingForm.startDate };
      let res;
      if (editTarget) res = await api.updateDriving(editTarget.id, payload);
      else res = await api.addDriving(payload);

      // 비고 저장
      const savedId = res?.data?.id || editTarget?.id;
      if (
        savedId &&
        drivingForm.notes &&
        drivingForm.notes.some((n) => n.content && n.content.trim())
      ) {
        await api.saveDrivingNotes(
          savedId,
          drivingForm.notes.filter((n) => n.content && n.content.trim()),
        );
      }

      setSuccess(editTarget ? "수정되었습니다." : "추가되었습니다.");
      setShowModal(false);
      loadMonth();
      loadDay();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDelete = async (id) => {
    setOpenMenu(null);
    if (!canEditDay) {
      setError("잠긴 주입니다. 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm("삭제할까요?")) return;
    try {
      await api.deleteDriving(id);
      loadMonth();
      loadDay();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // 법인카드 모달 (입력 가능한 날짜: 이번 달 중 열린 주, 이번 주 일요일까지)
  const receiptDates = dateOptions.filter(isDateEditable);
  const openReceiptAdd = () => {
    if (receiptDates.length === 0) {
      setError("잠긴 주입니다. 입력할 수 없습니다.");
      return;
    }
    setError("");
    setEditTarget(null);
    setReceiptForm({
      date: receiptDates.includes(TODAY)
        ? TODAY
        : receiptDates.includes(selectedDate)
          ? selectedDate
          : receiptDates[receiptDates.length - 1],
      category: categories[0]?.name || "",
      content: "",
      amount: "",
      businessNumber: "",
      companyName: "",
    });
    setShowReceiptModal(true);
  };
  const openReceiptEdit = (row) => {
    setError("");
    setEditTarget(row);
    setOpenMenu(null);
    setReceiptForm({
      date: row.date,
      category: row.category,
      content: row.content,
      amount: row.totalAmount || "",
      businessNumber: row.businessNumber,
      companyName: row.companyName,
    });
    setShowReceiptModal(true);
  };
  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    setError("");
    if (!isDateEditable(receiptForm.date)) {
      setError("잠긴 주의 날짜입니다. 입력할 수 없습니다.");
      return;
    }
    try {
      if (editTarget) await api.updateReceipt(editTarget.id, receiptForm);
      else await api.addReceipt(receiptForm);
      setSuccess(editTarget ? "수정되었습니다." : "추가되었습니다.");
      setShowReceiptModal(false);
      loadMonth();
    } catch (err) {
      setError(err.response?.data?.error || "처리 실패");
    }
  };
  const handleDeleteReceipt = async (id) => {
    setOpenMenu(null);
    if (!window.confirm("삭제할까요?")) return;
    try {
      await api.deleteReceipt(id);
      loadMonth();
    } catch (err) {
      setError(err.response?.data?.error || "삭제 실패");
    }
  };

  // 엑셀 / 인쇄 (salesExport.js 공용)
  const exportDriving = {
    year,
    month,
    author: username,
    driving: monthDriving,
    startMeter: monthStartMeter,
  };
  const exportReceipt = { year, month, author: username, receipts };
  const downloadDrivingExcel = () => exportDrivingExcel(exportDriving);
  const printDriving = () => exportPrintDriving(exportDriving);
  const downloadReceiptExcel = () => exportReceiptExcel(exportReceipt);
  const printReceipt = () => exportPrintReceipt(exportReceipt);

  // ··· 메뉴 (수정 / 삭제)
  const DotMenu = ({ id, onEdit, onDelete }) => (
    <div
      className={`sl-menu${openMenu === id ? " is-open" : ""}`}
      ref={openMenu === id ? menuRef : null}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className="sl-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenu(openMenu === id ? null : id);
        }}
      >
        ···
      </button>
      {openMenu === id && (
        <div className="sl-menu-list">
          <button
            className="sl-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            수정
          </button>
          <button
            className="sl-menu-item is-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );

  // 당일 합산 - 시간순 정렬 후 미터기 기준 운행거리 재계산
  const recalcDayDriving = (() => {
    const sorted = [...dayDriving].sort((a, b) => {
      if (!a.arrivalTime) return 1;
      if (!b.arrivalTime) return -1;
      return a.arrivalTime.localeCompare(b.arrivalTime);
    });
    const distMap = calcDistances(sorted, prevMeter);
    return sorted.map((d) => ({ ...d, distance: distMap[d.id] || 0 }));
  })();

  const dayMeters = recalcDayDriving.map((d) => d.meterReading).filter((m) => m > 0);
  const endMeter = dayMeters.length ? Math.max(...dayMeters) : 0;
  const totalKm = recalcDayDriving.reduce((s, d) => s + (d.distance || 0), 0);
  const workKm = sumDist(recalcDayDriving, "distance", "업무");
  const personalKm = sumDist(recalcDayDriving, "distance", "개인사용");
  const totalFuelC = recalcDayDriving.reduce((s, d) => s + (d.fuelCost || 0), 0);
  const km = (n) => (n > 0 ? `${fmt(n)}km` : "-");
  const receiptTotal = receipts.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const closeNoteEdit = () => {
    setNoteEditing(false);
    setNoteInput(dailyNote);
  };

  // 처음 쓰는 사람: 시작 미터기를 입력해야 들어갈 수 있음 (닫기 버튼 없음)
  if (needStartMeter)
    return (
      <StartMeterModal
        onSave={async (n) => {
          await api.saveStartMeter(n);
          setNeedStartMeter(false);
          setSuccess("시작 미터기가 저장되었습니다.");
          loadMonth();
          loadDay();
        }}
      />
    );

  return (
    <div>
      {/* 헤더: 이름 · 카드번호 · 연/월 */}
      <div className="sl-page-head">
        <div>
          <h2 className="sl-page-title">💼 영업 정산</h2>
          <p className="sl-page-sub">
            {username} {myCard ? `· ${myCard}` : ""}
          </p>
        </div>
        <div className="sl-btn-group">
          <select
            className="sl-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            className="sl-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLocked && (
        <div className="sl-banner-month-locked">
          🔒 이번 달은 잠겨있습니다. 입력/수정/삭제가 불가합니다.
        </div>
      )}
      {!isLocked && isWeekLocked && (
        <div className="sl-banner-week-locked">
          <span className="sl-banner-icon">🔒</span>
          <div>
            <div className="sl-banner-title">{`${selectedWeekNum}주차 기록이 잠겨있습니다.`}</div>
            <div className="sl-banner-desc">{"이 주의 기록은 입력/수정/삭제할 수 없습니다."}</div>
          </div>
        </div>
      )}
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

      {/* 메인 탭 */}
      <div className="sl-tab-bar">
        {[
          { id: "driving", label: "📋 운행일지" },
          { id: "receipt", label: "💳 법인카드" },
          { id: "stats", label: "📊 월간 통계" },
        ].map((t) => (
          <button
            key={t.id}
            className={`sl-tab ${mainTab === t.id ? "active" : ""}`}
            onClick={() => setMainTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ──── 월간 통계 ──── */}
      {mainTab === "stats" && (
        <SalesMonthlyStats
          year={year}
          month={month}
          driving={monthDriving}
          getPersonalFuelBalance={api.getPersonalFuelBalance}
        />
      )}

      {/* ──── 운행일지 ──── */}
      {mainTab === "driving" && (
        <div>
          {/* 날짜 선택 + 엑셀/인쇄 + 추가 버튼 */}
          <div className="sl-toolbar">
            <select
              className="sl-select sl-grow"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              {dateOptions.map((d) => (
                // 모든 날짜 선택·조회 가능, 입력/수정은 열린 주만 (입력 불가 날짜는 회색)
                <option
                  key={d}
                  value={d}
                  style={{ color: isDateEditable(d) ? "inherit" : "#999" }}
                >
                  {month}월 {parseInt(d.split("-")[2])}일
                  {d === TODAY ? " (오늘)" : ""}
                  {enteredDates.has(d) ? " ●" : ""}
                  {weekLocks[getWeekNumForDate(d)] === true ? " 🔒" : ""}
                </option>
              ))}
            </select>
            {monthDriving.length > 0 && (
              <>
                <button className="sl-btn-outline is-small" onClick={downloadDrivingExcel}>
                  📥 엑셀
                </button>
                <button className="sl-btn-outline is-small" onClick={printDriving}>
                  🖨 인쇄
                </button>
              </>
            )}
            {canEditDay && (
              <button className="sl-btn-primary" onClick={openAdd}>
                ＋ 추가
              </button>
            )}
            {!canEditDay && !isLocked && (
              <span className="sl-readonly-note">
                {isWeekLocked ? "🔒 잠긴 주" : "입력 기간이 아닙니다"} (조회만)
              </span>
            )}
          </div>

          {prevMeter > 0 && (
            <div className="sl-prev-meter">
              전일 미터기: <strong className="sl-text-sub">{fmt(prevMeter)}km</strong>
            </div>
          )}

          {/* 운행 기록 (PC 는 표, 모바일은 카드) */}
          {dayDriving.length === 0 ? (
            <div className="sl-empty-box">"기록이 없습니다."</div>
          ) : (
            <>
              <div className="desktop-table">
                <div className="sl-table-box has-gap">
                  <table className="sl-table sl-min-700">
                    <thead>
                      <tr>
                        <th>시간</th>
                        <th>도착지</th>
                        <th className="sl-num">미터기</th>
                        <th className="sl-num">운행거리</th>
                        <th>비고</th>
                        <th className="sl-num">주유량</th>
                        <th className="sl-num">주유금액</th>
                        <th className="sl-num">단가</th>
                        <th>구분</th>
                        {canEditDay && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {recalcDayDriving.map((d) => (
                        <tr key={d.id}>
                          <td>
                            {d.arrivalTime ? (
                              <span className="sl-time-badge">⏰ {formatDrivingTime(d)}</span>
                            ) : (
                              <span className="sl-none">-</span>
                            )}
                          </td>
                          <td className={d.destination ? "sl-cell-dest" : "sl-cell-empty"}>
                            {d.destination || "-"}
                          </td>
                          <td className="sl-num">{km(d.meterReading)}</td>
                          <td className="sl-num sl-cell-dist">{km(d.distance)}</td>
                          <td>
                            {d.notes && d.notes.length > 0 ? (
                              <div className="sl-note-list">
                                {d.notes.map((n, ni) => (
                                  <div key={ni} className="sl-note-item">
                                    {n.time && <span className="sl-note-time-badge">{n.time}</span>}
                                    <span className="sl-note-content">{n.content}</span>
                                  </div>
                                ))}
                              </div>
                            ) : d.purpose ? (
                              <span className="sl-note-content">{d.purpose}</span>
                            ) : (
                              <span className="sl-none">-</span>
                            )}
                          </td>
                          <td className="sl-num sl-text-amber">
                            {d.fuelAmount > 0 ? `${d.fuelAmount}L` : "-"}
                          </td>
                          <td className="sl-num">{d.fuelCost > 0 ? fmtWon(d.fuelCost) : "-"}</td>
                          <td className="sl-num sl-cell-small-muted">
                            {d.fuelUnitPrice > 0 ? `${fmt(d.fuelUnitPrice)}원` : "-"}
                          </td>
                          <td>
                            <TypeBadge type={d.type} nowrap />
                          </td>
                          {canEditDay && (
                            <td className="sl-cell-menu">
                              <DotMenu
                                id={d.id}
                                onEdit={() => openEdit(d)}
                                onDelete={() => handleDelete(d.id)}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mobile-cards">
                {recalcDayDriving.map((d) => (
                  <div key={d.id} className="sl-card">
                    <div className="sl-card-head">
                      <div className="sl-card-head-left">
                        {d.arrivalTime && (
                          <span className="sl-time-badge">⏰ {formatDrivingTime(d)}</span>
                        )}
                        {d.destination && <span className="sl-card-dest">{d.destination}</span>}
                        <TypeBadge type={d.type} />
                      </div>
                      {canEditDay && (
                        <DotMenu
                          id={d.id}
                          onEdit={() => openEdit(d)}
                          onDelete={() => handleDelete(d.id)}
                        />
                      )}
                    </div>
                    <div className="sl-card-grid">
                      {d.meterReading > 0 && <Row label="미터기" value={`${fmt(d.meterReading)}km`} />}
                      {d.distance > 0 && (
                        <Row label="운행거리" value={`${fmt(d.distance)}km`} color="#1557b0" />
                      )}
                      {((d.notes && d.notes.length > 0) || d.purpose) && (
                        <div>
                          <button
                            type="button"
                            className="sl-note-toggle"
                            onClick={() =>
                              setExpandedNotes((prev) => ({ ...prev, [d.id]: !prev[d.id] }))
                            }
                          >
                            <span className="sl-note-toggle-label">📝 비고</span>
                            <span className="sl-note-toggle-count">
                              {d.notes && d.notes.length > 0 ? `(${d.notes.length}개)` : ""}
                            </span>
                            <span className="sl-note-toggle-arrow">
                              {expandedNotes[d.id] ? "▲" : "▼"}
                            </span>
                          </button>
                          {expandedNotes[d.id] && (
                            <div className="sl-note-expanded">
                              {d.notes && d.notes.length > 0 ? (
                                d.notes.map((n, ni) => (
                                  <div key={ni} className="sl-note-chip">
                                    {n.time && <span className="sl-note-time-badge">{n.time}</span>}
                                    <span className="sl-note-content">{n.content}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="sl-note-chip-text">{d.purpose}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {d.fuelAmount > 0 && (
                        <Row label="주유량" value={`${d.fuelAmount}L`} color="#92400e" />
                      )}
                      {d.fuelCost > 0 && <Row label="주유금액" value={fmtWon(d.fuelCost)} />}
                      {d.fuelUnitPrice > 0 && (
                        <Row label="단가" value={`${fmt(d.fuelUnitPrice)}원/L`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 당일 합계 + 그날 비고 */}
          {(dayDriving.length > 0 || canEditDay) && (
            <div className="sl-day-summary">
              {dayDriving.length > 0 && (
                <div className="sl-day-summary-row">
                  {[
                    { label: "전일누계", value: km(prevMeter), color: "#555" },
                    { label: "금일누계", value: km(totalKm), color: "#1557b0" },
                    { label: "업무", value: km(workKm), color: "#1557b0" },
                    { label: "개인", value: km(personalKm), color: "#6d28d9" },
                    { label: "총누계", value: km(endMeter), color: "#059669" },
                    ...(totalFuelC > 0
                      ? [{ label: "금일주유", value: fmtWon(totalFuelC), color: "#92400e" }]
                      : []),
                  ].map((r, i, arr) => (
                    <div
                      key={r.label}
                      className={`sl-day-summary-cell${i === arr.length - 1 ? " is-last" : ""}`}
                    >
                      <div className="sl-stat-label">{r.label}</div>
                      <div className="sl-stat-value" style={{ color: r.color }}>
                        {r.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="sl-day-note">
                <span className="sl-day-note-label">📝 비고</span>
                {!canEditDay ? (
                  <span className={`sl-day-note-text${dailyNote ? "" : " is-empty"}`}>
                    {dailyNote || "없음"}
                  </span>
                ) : noteEditing ? (
                  <>
                    <input
                      type="text"
                      className="sl-day-note-input"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      autoFocus
                      placeholder="이날 비고 입력..."
                      disabled={isLocked}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveNote();
                        if (e.key === "Escape") closeNoteEdit();
                      }}
                    />
                    <button
                      className="sl-btn-primary is-small"
                      onClick={handleSaveNote}
                      disabled={noteSaving}
                    >
                      {noteSaving ? "..." : "저장"}
                    </button>
                    <button className="sl-btn-outline is-tight" onClick={closeNoteEdit}>
                      취소
                    </button>
                  </>
                ) : (
                  <span
                    className={`sl-day-note-edit${dailyNote ? "" : " is-empty"}${isLocked ? " is-locked" : ""}`}
                    onClick={() => !isLocked && setNoteEditing(true)}
                  >
                    {dailyNote || (isLocked ? "없음" : "클릭해서 입력...")}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── 법인카드 ──── */}
      {mainTab === "receipt" && (
        <div>
          <div className="sl-receipt-head">
            <p className="sl-card-no">
              카드번호: <strong className="sl-text-dark">{myCard || "미등록"}</strong>
            </p>
            <div className="sl-btn-group">
              {receipts.length > 0 && (
                <>
                  <button className="sl-btn-outline is-small" onClick={downloadReceiptExcel}>
                    📥 엑셀
                  </button>
                  <button className="sl-btn-outline is-small" onClick={printReceipt}>
                    🖨 인쇄
                  </button>
                </>
              )}
              {!isLocked && receiptDates.length > 0 && (
                <button className="sl-btn-primary" onClick={openReceiptAdd}>
                  ＋ 지출내역
                </button>
              )}
            </div>
          </div>

          {/* 모바일 카드 */}
          <div className="mobile-cards">
            {receipts.length === 0 ? (
              <div className="sl-empty-box is-small">내역이 없습니다.</div>
            ) : (
              receipts.map((r) => (
                <div key={r.id} className="sl-card">
                  <div className="sl-card-head">
                    <div className="sl-card-head-left">
                      <span className="sl-card-date">{r.date}</span>
                      {r.category && <span className="sl-cat-chip">{r.category}</span>}
                    </div>
                    {isDateEditable(r.date) && (
                      <DotMenu
                        id={`rm-${r.id}`}
                        onEdit={() => openReceiptEdit(r)}
                        onDelete={() => handleDeleteReceipt(r.id)}
                      />
                    )}
                  </div>
                  {r.content && <div className="sl-card-content">{r.content}</div>}
                  <div className="sl-card-grid">
                    {r.totalAmount > 0 && (
                      <Row label="총금액" value={fmtWon(r.totalAmount)} color="#1557b0" />
                    )}
                    {r.supplyAmount > 0 && <Row label="공급가액" value={fmtWon(r.supplyAmount)} />}
                    {r.vat > 0 && <Row label="VAT" value={fmtWon(r.vat)} color="#059669" />}
                    {r.businessNumber && <Row label="사업자" value={r.businessNumber} />}
                    {r.companyName && <Row label="상호" value={r.companyName} />}
                  </div>
                </div>
              ))
            )}
            {receipts.length > 0 && (
              <div className="sl-total-box">
                <span className="sl-total-label">합계</span>
                <span className="sl-total-value">{fmtWon(receiptTotal)}</span>
              </div>
            )}
          </div>

          {/* PC 표 */}
          <div className="desktop-table">
            <div className="sl-table-box">
              <table className="sl-table sl-min-600">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>카테고리</th>
                    <th>신용카드 번호</th>
                    <th className="sl-num">총금액</th>
                    <th className="sl-num">공급가액</th>
                    <th className="sl-num">VAT</th>
                    <th>사업자</th>
                    <th>상호</th>
                    {!isLocked && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr className="sl-no-line">
                      <td colSpan={9} className="sl-empty-cell is-tall">
                        내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.id}>
                        <td className="sl-cell-date">{r.date}</td>
                        <td>{r.category ? <span className="cat-badge">{r.category}</span> : "-"}</td>
                        <td className="sl-cell-ellipsis">{r.content || "-"}</td>
                        <td className="sl-num sl-cell-amount">
                          {r.totalAmount ? fmtWon(r.totalAmount) : "-"}
                        </td>
                        <td className="sl-num sl-cell-supply">
                          {r.supplyAmount ? fmtWon(r.supplyAmount) : "-"}
                        </td>
                        <td className="sl-num sl-cell-vat">{r.vat ? fmtWon(r.vat) : "-"}</td>
                        <td className="sl-small">{r.businessNumber || "-"}</td>
                        <td className="sl-cell-ellipsis is-narrow sl-small">
                          {r.companyName || "-"}
                        </td>
                        {!isLocked && (
                          <td className="sl-cell-menu">
                            {isDateEditable(r.date) && (
                              <DotMenu
                                id={`r-${r.id}`}
                                onEdit={() => openReceiptEdit(r)}
                                onDelete={() => handleDeleteReceipt(r.id)}
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {receipts.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="sl-foot-label">
                        합계
                      </td>
                      <td className="sl-num sl-foot-total">{fmtWon(receiptTotal)}</td>
                      <td className="sl-num sl-foot-sub">
                        {fmtWon(receipts.reduce((s, r) => s + (r.supplyAmount || 0), 0))}
                      </td>
                      <td className="sl-num sl-foot-vat">
                        {fmtWon(receipts.reduce((s, r) => s + (r.vat || 0), 0))}
                      </td>
                      <td colSpan={isLocked ? 2 : 3} className="sl-cell-bare"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──── 운행일지 입력창 ──── */}
      {showModal && (
        <DrivingModal
          form={drivingForm}
          setForm={setDrivingForm}
          isEdit={!!editTarget}
          error={error}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitDriving}
          dateMin={getWeekMonday(selectedDate)}
          dateMax={getWeekSunday(selectedDate)}
          meter={{
            lowerMeter,
            nextMeter,
            distPreview,
            tooLow: meterTooLow,
            tooHigh: meterTooHigh,
          }}
          dest={{
            list: destinations,
            search: destSearch,
            setSearch: setDestSearch,
            show: showDestDrop,
            setShow: setShowDestDrop,
            ref: destRef,
          }}
        />
      )}

      {/* ──── 법인카드 입력창 ──── */}
      {showReceiptModal && (
        <ReceiptModal
          form={receiptForm}
          setForm={setReceiptForm}
          isEdit={!!editTarget}
          categories={categories}
          error={error}
          onClose={() => setShowReceiptModal(false)}
          onSubmit={handleSubmitReceipt}
          dateMin={receiptDates[0]}
          dateMax={receiptDates[receiptDates.length - 1]}
        />
      )}
    </div>
  );
}

// 구분 배지 (업무 · 주유 · 개인주유 · 개인사용)
function TypeBadge({ type, nowrap }) {
  const ts = TYPE_STYLE[type] || { bg: "#f3f4f6", color: "#555" };
  return (
    <span
      className={`sl-type-badge${nowrap ? " sl-nowrap" : ""}`}
      style={{ "--type-color": ts.color, "--type-bg": ts.bg }}
    >
      {type}
    </span>
  );
}

// 모바일 카드 안 "이름 값" 한 줄
function Row({ label, value, color }) {
  return (
    <div className="sl-kv">
      <span className="sl-kv-label">{label}</span>
      <span className="sl-kv-value" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
