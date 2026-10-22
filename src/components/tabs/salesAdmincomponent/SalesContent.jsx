import { useEffect, useState, useRef, useCallback } from "react";
import { toDateStr } from "../../../utils/dateUtils";
import useToday from "../../../utils/useToday";
import "./sales.css";
import { salesApi as api } from "../../../api/sales";
import { formatDrivingTime } from "./DrivingTimeFields";
import SalesMonthlyStats from "./SalesMonthlyStats";
import ReceiptModal from "./ReceiptModal";
import DrivingModal from "./DrivingModal";
import * as XLSX from "xlsx";
import {
  fmt,
  fmtWon,
  pad2,
  TYPE_STYLE,
  getWeeksOfMonth,
  calcDistances,
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
const getKoreaTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

const sumDist = (list, key, type) =>
  list
    .filter((d) => !type || d.type === type)
    .reduce((s, d) => s + (d[key] || 0), 0);

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
      departureTime: "",
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

  // 법인카드 엑셀 다운로드
  // 운행일지 엑셀 다운로드 (월 전체)
  const downloadDrivingExcel = () => {
    const wb = XLSX.utils.book_new();

    // 미터기 기반 거리 재계산 (월 전체)
    const sorted = [...monthDriving].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (!a.arrivalTime) return 1;
      if (!b.arrivalTime) return -1;
      return a.arrivalTime.localeCompare(b.arrivalTime);
    });
    const distMap = calcDistances(sorted);
    const withDist = sorted.map((d) => ({
      ...d,
      calcDist: distMap[d.id] || 0,
    }));

    const titleRow = [[`${year}년 ${month}월 운행일지`]];
    const infoRow = [[`작성자: ${username}`, "", "", "", "", "", "", ""]];
    const colHeader = [
      [
        "날짜",
        "구분",
        "시간",
        "도착지",
        "미터기(km)",
        "운행거리(km)",
        "비고",
        "주유량(L)",
        "주유금액(원)",
        "단가(원/L)",
      ],
    ];
    const dataRows = withDist.map((d) => [
      d.date,
      d.type,
      formatDrivingTime(d),
      d.destination || "",
      d.meterReading || 0,
      d.calcDist || 0,
      d.purpose || "",
      d.fuelAmount || 0,
      d.fuelCost || 0,
      d.fuelUnitPrice || 0,
    ]);
    const totalRow = [
      "합계",
      "",
      "",
      "",
      "",
      withDist.reduce((s, d) => s + (d.calcDist || 0), 0),
      "",
      withDist.reduce((s, d) => s + (d.fuelAmount || 0), 0),
      withDist.reduce((s, d) => s + (d.fuelCost || 0), 0),
      "",
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      ...titleRow,
      ...infoRow,
      ...colHeader,
      ...dataRows,
      totalRow,
      ["업무 거리", "", "", "", "", sumDist(withDist, "calcDist", "업무")],
      ["개인 거리", "", "", "", "", sumDist(withDist, "calcDist", "개인사용")],
    ]);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
    ];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
    ws["!pageSetup"] = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    XLSX.utils.book_append_sheet(wb, ws, `${month}월 운행일지`);
    XLSX.writeFile(wb, `${year}년_${month}월_운행일지_${username}.xlsx`);
  };

  // 운행일지 인쇄 (월 전체)
  const printDriving = () => {
    const sorted = [...monthDriving].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (!a.arrivalTime) return 1;
      if (!b.arrivalTime) return -1;
      return a.arrivalTime.localeCompare(b.arrivalTime);
    });
    const distMap = calcDistances(sorted);
    const withDist = sorted.map((d) => ({
      ...d,
      calcDist: distMap[d.id] || 0,
    }));

    const typeColor = {
      업무: "#1557b0",
      주유: "#92400e",
      개인주유: "#9d174d",
      개인사용: "#6d28d9",
    };
    const rows = withDist
      .map(
        (d) => `
      <tr>
        <td>${d.date}</td>
        <td style="color:${typeColor[d.type] || "#333"};font-weight:bold">${d.type}</td>
        <td>${formatDrivingTime(d)}</td>
        <td>${d.destination || ""}</td>
        <td style="text-align:right">${d.meterReading ? fmt(d.meterReading) : ""}</td>
        <td style="text-align:right;font-weight:bold;color:#1557b0">${d.calcDist > 0 ? fmt(d.calcDist) : ""}</td>
        <td>${d.purpose || ""}</td>
        <td style="text-align:right">${d.fuelAmount > 0 ? d.fuelAmount + "L" : ""}</td>
        <td style="text-align:right">${d.fuelCost > 0 ? fmt(d.fuelCost) + "원" : ""}</td>
        <td style="text-align:right">${d.fuelUnitPrice > 0 ? fmt(d.fuelUnitPrice) : ""}</td>
      </tr>`,
      )
      .join("");
    const totalDist = withDist.reduce((s, d) => s + (d.calcDist || 0), 0);
    const totalFuelL = withDist.reduce((s, d) => s + (d.fuelAmount || 0), 0);
    const totalFuelC = withDist.reduce((s, d) => s + (d.fuelCost || 0), 0);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: 맑은고딕, sans-serif; margin: 10mm; }
        h2 { text-align: center; font-size: 15pt; margin-bottom: 4px; }
        .info { font-size: 10pt; margin-bottom: 8px; text-align: right; }
        table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        th, td { border: 1px solid #999; padding: 3px 5px; }
        th { background: #f0f0f0; text-align: center; font-weight: bold; }
        .total { font-weight: bold; background: #f0f4ff; }
        @media print { @page { size: A4 landscape; margin: 8mm; } }
      </style></head><body>
      <h2>${year}년 ${month}월 운행일지</h2>
      <div class="info">작성자: ${username}</div>
      <table>
        <thead><tr>
          <th>날짜</th><th>구분</th><th>시간</th><th>도착지</th>
          <th>미터기(km)</th><th>운행거리(km)</th><th>비고</th>
          <th>주유량</th><th>주유금액</th><th>단가</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="total">
            <td colspan="5" style="text-align:center">합 계</td>
            <td style="text-align:right">${fmt(totalDist)}km</td>
            <td></td>
            <td style="text-align:right">${totalFuelL.toFixed(2)}L</td>
            <td style="text-align:right">${fmt(totalFuelC)}원</td>
            <td></td>
          </tr>
          <tr class="total">
            <td colspan="5" style="text-align:center">업무 거리</td>
            <td style="text-align:right">${fmt(sumDist(withDist, "calcDist", "업무"))}km</td>
            <td colspan="4"></td>
          </tr>
          <tr class="total">
            <td colspan="5" style="text-align:center">개인 거리</td>
            <td style="text-align:right">${fmt(sumDist(withDist, "calcDist", "개인사용"))}km</td>
            <td colspan="4"></td>
          </tr>
        </tbody>
      </table>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  const downloadReceiptExcel = () => {
    const wb = XLSX.utils.book_new();
    const titleRow = [["신용카드 매출전표 등 수취금액 합계표"]];
    const infoRow = [
      [
        `20${String(year).slice(2)}  년  ${month}  월`,
        "",
        `작성자: ${username}`,
        "",
        "",
        "",
        "",
        "",
      ],
    ];
    const colHeader = [
      [
        "날 짜",
        "신용카드 카드번호",
        "내  용",
        "총 금액",
        "공급가액",
        "VAT",
        "사업자등록번호",
        "상호",
      ],
    ];
    const dataRows = receipts.map((r) => [
      r.date,
      r.content || "",
      r.category || "",
      r.totalAmount || 0,
      r.supplyAmount || 0,
      r.vat || 0,
      r.businessNumber || "",
      r.companyName || "",
    ]);
    const emptyRows = Array.from(
      { length: Math.max(0, 20 - dataRows.length) },
      () => ["", "", "", "", "", "", "", ""],
    );
    const totalRow = [
      "합  계",
      "",
      "",
      receipts.reduce((s, r) => s + (r.totalAmount || 0), 0),
      receipts.reduce((s, r) => s + (r.supplyAmount || 0), 0),
      receipts.reduce((s, r) => s + (r.vat || 0), 0),
      "",
      "",
    ];
    const ws = XLSX.utils.aoa_to_sheet([
      ...titleRow,
      ...infoRow,
      ...colHeader,
      ...dataRows,
      ...emptyRows,
      totalRow,
    ]);
    ws["!cols"] = [
      { wch: 10 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
    ];
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
    ws["!pageSetup"] = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    XLSX.utils.book_append_sheet(wb, ws, `${month}월 법인카드`);
    XLSX.writeFile(
      wb,
      `${year}년_${month}월_신용카드매출전표_${username}.xlsx`,
    );
  };

  // 법인카드 인쇄
  const printReceipt = () => {
    const fmt = (n) => Number(n || 0).toLocaleString();
    const rows = receipts
      .map(
        (r) => `
      <tr>
        <td style="text-align:center">${r.date ? r.date.slice(5) : ""}</td>
        <td>${r.content || ""}</td>
        <td>${r.category || ""}</td>
        <td style="text-align:right">${r.totalAmount ? fmt(r.totalAmount) : ""}</td>
        <td style="text-align:right">${r.supplyAmount ? fmt(r.supplyAmount) : ""}</td>
        <td style="text-align:right">${r.vat ? fmt(r.vat) : ""}</td>
        <td>${r.businessNumber || ""}</td>
        <td>${r.companyName || ""}</td>
      </tr>`,
      )
      .join("");
    const emptyRows = Array.from(
      { length: Math.max(0, 22 - receipts.length) },
      () =>
        `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`,
    ).join("");
    const totalAmt = receipts.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const totalSupply = receipts.reduce((s, r) => s + (r.supplyAmount || 0), 0);
    const totalVat = receipts.reduce((s, r) => s + (r.vat || 0), 0);
    const total = `<tr style="font-weight:bold">
      <td colspan="3" style="text-align:center;border-top:2px solid #000">합 계</td>
      <td style="text-align:right;border-top:2px solid #000">${fmt(totalAmt)}</td>
      <td style="text-align:right;border-top:2px solid #000">${fmt(totalSupply)}</td>
      <td style="text-align:right;border-top:2px solid #000">${fmt(totalVat)}</td>
      <td style="border-top:2px solid #000"></td>
      <td style="border-top:2px solid #000"></td>
    </tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: '맑은 고딕', sans-serif; padding: 8mm; }
        h2 { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 6px; letter-spacing: 1px; }
        .info { font-size: 10pt; margin-bottom: 6px; display: flex; gap: 30px; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th { border: 1.5px solid #000; padding: 5px 4px; text-align: center; font-weight: bold; background: #fff; }
        td { border: 1px solid #000; padding: 4px; height: 22px; }
        th:nth-child(1), td:nth-child(1) { width: 7%; }
        th:nth-child(2), td:nth-child(2) { width: 18%; }
        th:nth-child(3), td:nth-child(3) { width: 12%; }
        th:nth-child(4), td:nth-child(4) { width: 11%; }
        th:nth-child(5), td:nth-child(5) { width: 11%; }
        th:nth-child(6), td:nth-child(6) { width: 8%; }
        th:nth-child(7), td:nth-child(7) { width: 14%; }
        th:nth-child(8), td:nth-child(8) { width: 14%; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { padding: 0; }
        }
      </style></head><body>
      <h2>신용카드 매출전표 등 수취금액 합계표</h2>
      <div class="info">
        <span>20&nbsp;&nbsp;&nbsp;년&nbsp;&nbsp;&nbsp;${month}&nbsp;&nbsp;&nbsp;월</span>
        <span>작성자: ${username}</span>
      </div>
      <table>
        <thead><tr>
          <th>날 짜</th>
          <th>신용카드 카드번호</th>
          <th>내&nbsp;&nbsp;용</th>
          <th>총 금액</th>
          <th>공급가액</th>
          <th>VAT</th>
          <th>사업자등록번호</th>
          <th>상호</th>
        </tr></thead>
        <tbody>${rows}${emptyRows}${total}</tbody>
      </table>
      <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  const DotMenu = ({ id, onEdit, onDelete }) => (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        zIndex: openMenu === id ? 1000 : 1,
      }}
      ref={openMenu === id ? menuRef : null}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenu(openMenu === id ? null : id);
        }}
        style={{
          background: "none",
          border: "none",
          fontSize: "18px",
          color: "#bbb",
          cursor: "pointer",
          padding: "2px 8px",
          lineHeight: 1,
        }}
      >
        ···
      </button>
      {openMenu === id && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #e8eaed",
            borderRadius: "10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            overflow: "hidden",
            minWidth: "90px",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 16px",
              border: "none",
              background: "#fff",
              fontSize: "13px",
              color: "#333",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            수정
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 16px",
              border: "none",
              background: "#fff",
              fontSize: "13px",
              color: "#dc2626",
              textAlign: "left",
              cursor: "pointer",
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

  const dayMeters = recalcDayDriving
    .map((d) => d.meterReading)
    .filter((m) => m > 0);
  const endMeter = dayMeters.length ? Math.max(...dayMeters) : 0;
  const totalKm = recalcDayDriving.reduce((s, d) => s + (d.distance || 0), 0);
  const workKm = sumDist(recalcDayDriving, "distance", "업무");
  const personalKm = sumDist(recalcDayDriving, "distance", "개인사용");
  const totalFuelC = recalcDayDriving.reduce(
    (s, d) => s + (d.fuelCost || 0),
    0,
  );

  return (
    <div>
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a2e" }}>
            💼 영업 정산
          </h2>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            {username} {myCard ? `· ${myCard}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
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
        </div>
      </div>

      {isLocked && (
        <div
          style={{
            background: "#fff0f0",
            border: "1px solid #fed7d7",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
            fontSize: "13px",
            color: "#dc2626",
            fontWeight: 500,
          }}
        >
          🔒 이번 달은 잠겨있습니다. 입력/수정/삭제가 불가합니다.
        </div>
      )}
      {!isLocked && isWeekLocked && (
        <div
          style={{
            background: "#fffbeb",
            border: "2px solid #f59e0b",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "20px" }}>🔒</span>
          <div>
            <div
              style={{ fontSize: "14px", fontWeight: 700, color: "#92400e" }}
            >
              {`${selectedWeekNum}주차 기록이 잠겨있습니다.`}
            </div>
            <div
              style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}
            >
              {"이 주의 기록은 입력/수정/삭제할 수 없습니다."}
            </div>
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
      <div className="sl-tab-bar" style={{ marginBottom: "14px" }}>
        <button
          className={`sl-tab ${mainTab === "driving" ? "active" : ""}`}
          onClick={() => setMainTab("driving")}
        >
          📋 운행일지
        </button>
        <button
          className={`sl-tab ${mainTab === "receipt" ? "active" : ""}`}
          onClick={() => setMainTab("receipt")}
        >
          💳 법인카드
        </button>
        <button
          className={`sl-tab ${mainTab === "stats" ? "active" : ""}`}
          onClick={() => setMainTab("stats")}
        >
          📊 월간 통계
        </button>
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
          {/* 날짜 선택 + 추가 버튼 */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ ...selStyle, flex: 1 }}
            >
              {dateOptions.map((d) => {
                const day = parseInt(d.split("-")[2]);
                const hasEntry = enteredDates.has(d);
                const isT = d === TODAY;
                // 모든 날짜 선택·조회 가능, 입력/수정은 열린 주만
                const wLocked = weekLocks[getWeekNumForDate(d)] === true;
                const readOnly = !isDateEditable(d);
                return (
                  <option
                    key={d}
                    value={d}
                    style={{ color: readOnly ? "#999" : "inherit" }}
                  >
                    {month}월 {day}일{isT ? " (오늘)" : ""}
                    {hasEntry ? " ●" : ""}
                    {wLocked ? " 🔒" : ""}
                  </option>
                );
              })}
            </select>
            {monthDriving.length > 0 && (
              <>
                <button
                  className="sl-btn-outline"
                  onClick={downloadDrivingExcel}
                  style={{ fontSize: "12px", padding: "7px 12px" }}
                >
                  📥 엑셀
                </button>
                <button
                  className="sl-btn-outline"
                  onClick={printDriving}
                  style={{ fontSize: "12px", padding: "7px 12px" }}
                >
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
              <span
                style={{ fontSize: "12px", color: "#bbb", padding: "0 4px" }}
              >
                {isWeekLocked ? "🔒 잠긴 주" : "입력 기간이 아닙니다"} (조회만)
              </span>
            )}
          </div>

          {/* 전일 미터기 정보 */}
          {prevMeter > 0 && (
            <div
              style={{
                fontSize: "12px",
                color: "#888",
                marginBottom: "8px",
                paddingLeft: "4px",
              }}
            >
              전일 미터기:{" "}
              <strong style={{ color: "#555" }}>{fmt(prevMeter)}km</strong>
            </div>
          )}

          {/* 운행 기록 */}
          {dayDriving.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "10px",
                border: "1.5px dashed #e0e0e0",
                padding: "2.5rem",
                textAlign: "center",
                color: "#bbb",
                fontSize: "13px",
              }}
            >
              "기록이 없습니다."
            </div>
          ) : (
            <>
              {/* 데스크탑 표 */}
              <div style={{ display: "none" }} className="desktop-table">
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    border: "1px solid #e8eaed",
                    overflow: "visible",
                    marginBottom: "12px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                      minWidth: "700px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#f8f9fb",
                          borderBottom: "1px solid #e8eaed",
                        }}
                      >
                        <th style={thS}>시간</th>
                        <th style={thS}>도착지</th>
                        <th style={{ ...thS, textAlign: "right" }}>미터기</th>
                        <th style={{ ...thS, textAlign: "right" }}>운행거리</th>
                        <th style={thS}>비고</th>
                        <th style={{ ...thS, textAlign: "right" }}>주유량</th>
                        <th style={{ ...thS, textAlign: "right" }}>주유금액</th>
                        <th style={{ ...thS, textAlign: "right" }}>단가</th>
                        <th style={thS}>구분</th>
                        {canEditDay && <th style={thS}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {recalcDayDriving.map((d) => {
                        const ts = TYPE_STYLE[d.type] || {
                          bg: "#f3f4f6",
                          color: "#555",
                        };
                        return (
                          <tr
                            key={d.id}
                            style={{ borderBottom: "1px solid #f0f2f5" }}
                          >
                            <td style={{ ...tdS }}>
                              {d.arrivalTime ? (
                                <span
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "#1557b0",
                                    background: "#e8f0fe",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  ⏰ {formatDrivingTime(d)}
                                </span>
                              ) : (
                                <span style={{ color: "#ccc" }}>-</span>
                              )}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                fontWeight: d.destination ? 500 : 400,
                                color: d.destination ? "#1a1a2e" : "#ccc",
                              }}
                            >
                              {d.destination || "-"}
                            </td>
                            <td style={{ ...tdS, textAlign: "right" }}>
                              {d.meterReading > 0
                                ? `${fmt(d.meterReading)}km`
                                : "-"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                textAlign: "right",
                                fontWeight: 600,
                                color: "#1557b0",
                              }}
                            >
                              {d.distance > 0 ? `${fmt(d.distance)}km` : "-"}
                            </td>
                            <td style={{ ...tdS }}>
                              {d.notes && d.notes.length > 0 ? (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "3px",
                                  }}
                                >
                                  {d.notes.map((n, ni) => (
                                    <div
                                      key={ni}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                      }}
                                    >
                                      {n.time && (
                                        <span
                                          style={{
                                            fontSize: "11px",
                                            color: "#1557b0",
                                            fontWeight: 700,
                                            background: "#e8f0fe",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {n.time}
                                        </span>
                                      )}
                                      <span
                                        style={{
                                          fontSize: "12px",
                                          color: "#374151",
                                        }}
                                      >
                                        {n.content}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : d.purpose ? (
                                <span
                                  style={{ fontSize: "12px", color: "#374151" }}
                                >
                                  {d.purpose}
                                </span>
                              ) : (
                                <span style={{ color: "#ccc" }}>-</span>
                              )}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                textAlign: "right",
                                color: "#92400e",
                              }}
                            >
                              {d.fuelAmount > 0 ? `${d.fuelAmount}L` : "-"}
                            </td>
                            <td style={{ ...tdS, textAlign: "right" }}>
                              {d.fuelCost > 0 ? fmtWon(d.fuelCost) : "-"}
                            </td>
                            <td
                              style={{
                                ...tdS,
                                textAlign: "right",
                                fontSize: "12px",
                                color: "#888",
                              }}
                            >
                              {d.fuelUnitPrice > 0
                                ? `${fmt(d.fuelUnitPrice)}원`
                                : "-"}
                            </td>
                            <td style={tdS}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "3px 8px",
                                  borderRadius: "99px",
                                  background: ts.bg,
                                  color: ts.color,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {d.type}
                              </span>
                            </td>
                            {canEditDay && (
                              <td style={{ ...tdS, position: "relative" }}>
                                <DotMenu
                                  id={d.id}
                                  onEdit={() => openEdit(d)}
                                  onDelete={() => handleDelete(d.id)}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 모바일 카드 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "12px",
                }}
                className="mobile-cards"
              >
                {recalcDayDriving.map((d) => {
                  const ts = TYPE_STYLE[d.type] || {
                    bg: "#f3f4f6",
                    color: "#555",
                  };
                  return (
                    <div
                      key={d.id}
                      style={{
                        background: "#fff",
                        borderRadius: "10px",
                        border: "1px solid #e8eaed",
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {d.arrivalTime && (
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#1557b0",
                                background: "#e8f0fe",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                letterSpacing: "0.5px",
                              }}
                            >
                              ⏰ {formatDrivingTime(d)}
                            </span>
                          )}
                          {d.destination && (
                            <span style={{ fontWeight: 600, fontSize: "14px" }}>
                              {d.destination}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "99px",
                              background: ts.bg,
                              color: ts.color,
                            }}
                          >
                            {d.type}
                          </span>
                        </div>
                        {canEditDay && (
                          <DotMenu
                            id={d.id}
                            onEdit={() => openEdit(d)}
                            onDelete={() => handleDelete(d.id)}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "4px 12px",
                          fontSize: "12px",
                        }}
                      >
                        {d.meterReading > 0 && (
                          <Row
                            label="미터기"
                            value={`${fmt(d.meterReading)}km`}
                          />
                        )}
                        {d.distance > 0 && (
                          <Row
                            label="운행거리"
                            value={`${fmt(d.distance)}km`}
                            color="#1557b0"
                          />
                        )}
                        {((d.notes && d.notes.length > 0) || d.purpose) && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNotes((prev) => ({
                                  ...prev,
                                  [d.id]: !prev[d.id],
                                }))
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "none",
                                border: "none",
                                padding: "4px 0",
                                cursor: "pointer",
                                width: "100%",
                                textAlign: "left",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#aaa",
                                  fontWeight: 600,
                                }}
                              >
                                📝 비고
                              </span>
                              <span style={{ fontSize: "11px", color: "#aaa" }}>
                                {d.notes && d.notes.length > 0
                                  ? `(${d.notes.length}개)`
                                  : ""}
                              </span>
                              <span
                                style={{
                                  marginLeft: "auto",
                                  fontSize: "12px",
                                  color: "#aaa",
                                }}
                              >
                                {expandedNotes[d.id] ? "▲" : "▼"}
                              </span>
                            </button>
                            {expandedNotes[d.id] && (
                              <div
                                style={{
                                  marginTop: "4px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}
                              >
                                {d.notes && d.notes.length > 0 ? (
                                  d.notes.map((n, ni) => (
                                    <div
                                      key={ni}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "4px 8px",
                                        background: "#f8f9fb",
                                        borderRadius: "6px",
                                      }}
                                    >
                                      {n.time && (
                                        <span
                                          style={{
                                            fontSize: "11px",
                                            color: "#1557b0",
                                            fontWeight: 700,
                                            background: "#e8f0fe",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {n.time}
                                        </span>
                                      )}
                                      <span
                                        style={{
                                          fontSize: "12px",
                                          color: "#374151",
                                        }}
                                      >
                                        {n.content}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: "#374151",
                                      padding: "4px 8px",
                                      background: "#f8f9fb",
                                      borderRadius: "6px",
                                    }}
                                  >
                                    {d.purpose}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {d.fuelAmount > 0 && (
                          <Row
                            label="주유량"
                            value={`${d.fuelAmount}L`}
                            color="#92400e"
                          />
                        )}
                        {d.fuelCost > 0 && (
                          <Row label="주유금액" value={fmtWon(d.fuelCost)} />
                        )}
                        {d.fuelUnitPrice > 0 && (
                          <Row
                            label="단가"
                            value={`${fmt(d.fuelUnitPrice)}원/L`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 당일 요약 + 비고 */}
          {(dayDriving.length > 0 || canEditDay) && (
            <div
              style={{
                background: "#fff",
                borderRadius: "10px",
                border: "1px solid #e8eaed",
                overflow: "hidden",
              }}
            >
              {/* 누계 행 */}
              {dayDriving.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "0",
                    borderBottom: "1px solid #f0f2f5",
                  }}
                >
                  {[
                    {
                      label: "전일누계",
                      value: prevMeter > 0 ? `${fmt(prevMeter)}km` : "-",
                      color: "#555",
                    },
                    {
                      label: "금일누계",
                      value: totalKm > 0 ? `${fmt(totalKm)}km` : "-",
                      color: "#1557b0",
                    },
                    {
                      label: "업무",
                      value: workKm > 0 ? `${fmt(workKm)}km` : "-",
                      color: "#1557b0",
                    },
                    {
                      label: "개인",
                      value: personalKm > 0 ? `${fmt(personalKm)}km` : "-",
                      color: "#6d28d9",
                    },
                    {
                      label: "총누계",
                      value: endMeter > 0 ? `${fmt(endMeter)}km` : "-",
                      color: "#059669",
                    },
                    ...(totalFuelC > 0
                      ? [
                          {
                            label: "금일주유",
                            value: fmtWon(totalFuelC),
                            color: "#92400e",
                          },
                        ]
                      : []),
                  ].map((r, i, arr) => (
                    <div
                      key={r.label}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        textAlign: "center",
                        borderRight:
                          i < arr.length - 1 ? "1px solid #f0f2f5" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#aaa",
                          marginBottom: "3px",
                          fontWeight: 600,
                        }}
                      >
                        {r.label}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: r.color,
                        }}
                      >
                        {r.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 비고 */}
              <div
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minHeight: "44px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  📝 비고
                </span>
                {!canEditDay ? (
                  <span
                    style={{
                      fontSize: "13px",
                      color: dailyNote ? "#333" : "#ccc",
                    }}
                  >
                    {dailyNote || "없음"}
                  </span>
                ) : noteEditing ? (
                  <>
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      autoFocus
                      placeholder="이날 비고 입력..."
                      disabled={isLocked}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        border: "1.5px solid #1557b0",
                        borderRadius: "7px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveNote();
                        if (e.key === "Escape") {
                          setNoteEditing(false);
                          setNoteInput(dailyNote);
                        }
                      }}
                    />
                    <button
                      className="sl-btn-primary"
                      onClick={handleSaveNote}
                      disabled={noteSaving}
                      style={{ padding: "7px 12px", fontSize: "12px" }}
                    >
                      {noteSaving ? "..." : "저장"}
                    </button>
                    <button
                      className="sl-btn-outline"
                      onClick={() => {
                        setNoteEditing(false);
                        setNoteInput(dailyNote);
                      }}
                      style={{ padding: "7px 10px", fontSize: "12px" }}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <span
                    onClick={() => !isLocked && setNoteEditing(true)}
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      color: dailyNote ? "#333" : "#bbb",
                      cursor: isLocked ? "default" : "pointer",
                      padding: "4px 0",
                    }}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <p style={{ fontSize: "13px", color: "#888" }}>
              카드번호:{" "}
              <strong style={{ color: "#1a1a2e" }}>{myCard || "미등록"}</strong>
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              {receipts.length > 0 && (
                <>
                  <button
                    className="sl-btn-outline"
                    onClick={downloadReceiptExcel}
                    style={{ fontSize: "12px", padding: "7px 12px" }}
                  >
                    📥 엑셀
                  </button>
                  <button
                    className="sl-btn-outline"
                    onClick={printReceipt}
                    style={{ fontSize: "12px", padding: "7px 12px" }}
                  >
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
          {/* 모바일 법인카드 카드 */}
          <div
            className="mobile-cards"
            style={{
              display: "none",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            {receipts.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1.5px dashed #e0e0e0",
                  padding: "2rem",
                  textAlign: "center",
                  color: "#bbb",
                  fontSize: "13px",
                }}
              >
                내역이 없습니다.
              </div>
            ) : (
              receipts.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    border: "1px solid #e8eaed",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "#888" }}>
                        {r.date}
                      </span>
                      {r.category && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "99px",
                            background: "#e8f0fe",
                            color: "#1557b0",
                          }}
                        >
                          {r.category}
                        </span>
                      )}
                    </div>
                    {isDateEditable(r.date) && (
                      <DotMenu
                        id={`rm-${r.id}`}
                        onEdit={() => openReceiptEdit(r)}
                        onDelete={() => handleDeleteReceipt(r.id)}
                      />
                    )}
                  </div>
                  {r.content && (
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "6px",
                      }}
                    >
                      {r.content}
                    </div>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "4px 12px",
                      fontSize: "12px",
                    }}
                  >
                    {r.totalAmount > 0 && (
                      <Row
                        label="총금액"
                        value={fmtWon(r.totalAmount)}
                        color="#1557b0"
                      />
                    )}
                    {r.supplyAmount > 0 && (
                      <Row label="공급가액" value={fmtWon(r.supplyAmount)} />
                    )}
                    {r.vat > 0 && (
                      <Row label="VAT" value={fmtWon(r.vat)} color="#059669" />
                    )}
                    {r.businessNumber && (
                      <Row label="사업자" value={r.businessNumber} />
                    )}
                    {r.companyName && (
                      <Row label="상호" value={r.companyName} />
                    )}
                  </div>
                </div>
              ))
            )}
            {receipts.length > 0 && (
              <div
                style={{
                  background: "#f0f4ff",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1557b0",
                  }}
                >
                  합계
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#1557b0",
                  }}
                >
                  {fmtWon(
                    receipts.reduce((s, r) => s + (r.totalAmount || 0), 0),
                  )}
                </span>
              </div>
            )}
          </div>

          {/* 데스크탑 법인카드 표 */}
          <div className="desktop-table" style={{ display: "none" }}>
            <div
              style={{
                background: "#fff",
                borderRadius: "10px",
                border: "1px solid #e8eaed",
                overflow: "visible",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  minWidth: "600px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f8f9fb",
                      borderBottom: "1px solid #e8eaed",
                    }}
                  >
                    <th style={thS}>날짜</th>
                    <th style={thS}>카테고리</th>
                    <th style={thS}>신용카드 번호</th>
                    <th style={{ ...thS, textAlign: "right" }}>총금액</th>
                    <th style={{ ...thS, textAlign: "right" }}>공급가액</th>
                    <th style={{ ...thS, textAlign: "right" }}>VAT</th>
                    <th style={thS}>사업자</th>
                    <th style={thS}>상호</th>
                    {!isLocked && <th style={thS}></th>}
                  </tr>
                </thead>
                <tbody>
                  {receipts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          padding: "2.5rem",
                          color: "#bbb",
                          fontSize: "13px",
                        }}
                      >
                        내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr
                        key={r.id}
                        style={{ borderBottom: "1px solid #f0f2f5" }}
                      >
                        <td
                          style={{
                            ...tdS,
                            fontSize: "12px",
                            color: "#888",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.date}
                        </td>
                        <td style={tdS}>
                          {r.category ? (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "3px 8px",
                                borderRadius: "99px",
                                background: "#e8f0fe",
                                color: "#1557b0",
                              }}
                            >
                              {r.category}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            maxWidth: "120px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.content || "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            fontWeight: 600,
                            color: "#1557b0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.totalAmount ? fmtWon(r.totalAmount) : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            color: "#555",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.supplyAmount ? fmtWon(r.supplyAmount) : "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            textAlign: "right",
                            color: "#059669",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.vat ? fmtWon(r.vat) : "-"}
                        </td>
                        <td style={{ ...tdS, fontSize: "12px" }}>
                          {r.businessNumber || "-"}
                        </td>
                        <td
                          style={{
                            ...tdS,
                            fontSize: "12px",
                            maxWidth: "80px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.companyName || "-"}
                        </td>
                        {!isLocked && (
                          <td style={{ ...tdS, position: "relative" }}>
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
                    <tr
                      style={{
                        background: "#f0f4ff",
                        borderTop: "2px solid #e8eaed",
                      }}
                    >
                      <td
                        colSpan={3}
                        style={{ ...tdS, fontWeight: 700, color: "#1557b0" }}
                      >
                        합계
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#1557b0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtWon(
                          receipts.reduce(
                            (s, r) => s + (r.totalAmount || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          color: "#555",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtWon(
                          receipts.reduce(
                            (s, r) => s + (r.supplyAmount || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        style={{
                          ...tdS,
                          textAlign: "right",
                          color: "#059669",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtWon(receipts.reduce((s, r) => s + (r.vat || 0), 0))}
                      </td>
                      <td colSpan={isLocked ? 2 : 3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──── 운행일지 모달 ──── */}
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

      {/* ──── 법인카드 모달 ──── */}
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
          modalStyle={{ maxHeight: "90vh" }}
        />
      )}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      <span style={{ color: "#aaa", fontSize: "11px" }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || "#1a1a2e" }}>
        {value}
      </span>
    </div>
  );
}

const selStyle = {
  padding: "8px 12px",
  border: "1.5px solid #d8dce3",
  borderRadius: "7px",
  fontSize: "13px",
  outline: "none",
  background: "#fff",
};
const thS = {
  padding: "9px 12px",
  textAlign: "left",
  fontSize: "11px",
  fontWeight: 600,
  color: "#888",
  whiteSpace: "nowrap",
};
const tdS = { padding: "11px 12px" };
