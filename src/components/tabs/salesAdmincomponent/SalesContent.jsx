import { useEffect, useState, useRef, useCallback } from "react";
import "./SalesContent.css"; // 수정
import axios from "axios";
import * as XLSX from "xlsx";

const BASE_URL = process.env.REACT_APP_API_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
});

const api = {
  getLockStatus: (y, m) =>
    axios.get(`${BASE_URL}/sales-form/lock-status`, {
      ...authHeader(),
      params: { year: y, month: m },
    }),
  getMyCard: () => axios.get(`${BASE_URL}/sales-form/my-card`, authHeader()),
  getCategories: () =>
    axios.get(`${BASE_URL}/sales-form/categories`, authHeader()),
  getPurposes: () => axios.get(`${BASE_URL}/sales-form/purposes`, authHeader()),
  getDrivingNotes: (drivingId) =>
    axios.get(
      `${BASE_URL}/sales-form/driving/${drivingId}/notes`,
      authHeader(),
    ),
  saveDrivingNotes: (drivingId, contents) =>
    axios.post(
      `${BASE_URL}/sales-form/driving/${drivingId}/notes`,
      contents,
      authHeader(),
    ),
  getDestinations: () =>
    axios.get(`${BASE_URL}/sales-form/destinations`, authHeader()),
  getDriving: (y, m) =>
    axios.get(`${BASE_URL}/sales-form/driving`, {
      ...authHeader(),
      params: { year: y, month: m },
    }),
  getDrivingDate: (date) =>
    axios.get(`${BASE_URL}/sales-form/driving/date`, {
      ...authHeader(),
      params: { date },
    }),
  getPrevMeter: (date) =>
    axios.get(`${BASE_URL}/sales-form/driving/prev-meter`, {
      ...authHeader(),
      params: { date },
    }),
  addDriving: (data) =>
    axios.post(`${BASE_URL}/sales-form/driving`, data, authHeader()),
  updateDriving: (id, data) =>
    axios.put(`${BASE_URL}/sales-form/driving/${id}`, data, authHeader()),
  deleteDriving: (id) =>
    axios.delete(`${BASE_URL}/sales-form/driving/${id}`, authHeader()),
  getReceipts: (y, m) =>
    axios.get(`${BASE_URL}/sales-form/receipt`, {
      ...authHeader(),
      params: { year: y, month: m },
    }),
  addReceipt: (data) =>
    axios.post(`${BASE_URL}/sales-form/receipt`, data, authHeader()),
  updateReceipt: (id, data) =>
    axios.put(`${BASE_URL}/sales-form/receipt/${id}`, data, authHeader()),
  deleteReceipt: (id) =>
    axios.delete(`${BASE_URL}/sales-form/receipt/${id}`, authHeader()),
  getDailyNote: (date) =>
    axios.get(`${BASE_URL}/sales-form/daily-note`, {
      ...authHeader(),
      params: { date },
    }),
  saveDailyNote: (date, note) =>
    axios.post(
      `${BASE_URL}/sales-form/daily-note`,
      { date, note },
      authHeader(),
    ),
};

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtWon = (n) => fmt(n) + "원";
const pad2 = (n) => String(n).padStart(2, "0");
const TYPES = ["업무", "주유", "휴가"];
const TODAY = new Date().toISOString().split("T")[0];
const getThisWeekMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-CA");
};
const getThisWeekSunday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-CA");
};
const THIS_WEEK_MONDAY = getThisWeekMonday();
const THIS_WEEK_SUNDAY = getThisWeekSunday();
const getKoreaTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

const TYPE_STYLE = {
  업무: { bg: "#e8f0fe", color: "#1557b0" },
  주유: { bg: "#fef3c7", color: "#92400e" },
  휴가: { bg: "#fce7f3", color: "#9d174d" },
};

export default function SalesContent() {
  const now = new Date();
  const username = sessionStorage.getItem("username");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mainTab, setMainTab] = useState("driving");

  const [isLocked, setIsLocked] = useState(false);
  const [weekLocks, setWeekLocks] = useState({}); // ← 이 줄 추가
  const [myCard, setMyCard] = useState("");
  const [categories, setCategories] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [noteInputs, setNoteInputs] = useState([""]); // 비고 입력 칸들
  const [expandedNotes, setExpandedNotes] = useState({}); // 모바일 비고 펼치기
  const [noteEditingId, setNoteEditingId] = useState(null); // 현재 비고 편집 중인 drivingId
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
  const purposeRef = useRef(null);

  const [drivingForm, setDrivingForm] = useState({
    date: TODAY,
    type: "업무",
    destination: "",
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
  const [purposeSearch, setPurposeSearch] = useState("");
  const [showPurposeDrop, setShowPurposeDrop] = useState(false);
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

  const isToday = selectedDate === TODAY;

  // 월요일 기준 주 계산
  // 날짜 문자열을 로컬 시간으로 파싱 (UTC 문제 방지)
  const parseLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const getWeeksOfMonth = (y, m) => {
    const weeks = [];
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    let start = new Date(firstDay);
    const dow = start.getDay();
    if (dow !== 1) {
      start.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));
    }
    let weekNum = 1;
    while (start <= lastDay) {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const cs = start < firstDay ? new Date(firstDay) : new Date(start);
      const ce = end > lastDay ? new Date(lastDay) : new Date(end);
      weeks.push({
        weekNum,
        start: cs,
        end: ce,
        label: `${cs.getDate()}일~${ce.getDate()}일`,
      });
      start.setDate(start.getDate() + 7);
      weekNum++;
    }
    return weeks;
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
  const isAnyLocked = isLocked || isWeekLocked;
  const isPast = selectedDate < TODAY;

  // 이번 주 여부 (UI 표시용)
  const todayWeekNum = getWeekNumForDate(TODAY);
  const isThisWeek =
    selectedWeekNum === todayWeekNum &&
    year === new Date().getFullYear() &&
    month === new Date().getMonth() + 1;

  const receiptBase = Number(receiptForm.amount || 0);
  const supplyPreview = receiptBase ? Math.round(receiptBase / 1.1) : 0;
  const vatPreview = receiptBase ? receiptBase - supplyPreview : 0;
  const distPreview =
    drivingForm.meterReading && lastMeter
      ? parseInt(drivingForm.meterReading) - lastMeter
      : null;
  const meterTooLow =
    drivingForm.meterReading &&
    lastMeter > 0 &&
    parseInt(drivingForm.meterReading) < lastMeter;

  const enteredDates = new Set(monthDriving.map((d) => d.date));

  const loadMonth = useCallback(async () => {
    try {
      const [lock, drv, rec, cats, purp, card] = await Promise.all([
        api.getLockStatus(year, month),
        api.getDriving(year, month),
        api.getReceipts(year, month),
        api.getCategories(),
        api.getPurposes(),
        api.getMyCard(),
      ]);
      setIsLocked(lock.data.locked);
      setWeekLocks(lock.data.weekLocks || {});
      setMonthDriving(drv.data);
      setReceipts(rec.data);
      setCategories(cats.data);
      setPurposes(purp.data);
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
  useEffect(() => {
    loadDay();
  }, [loadDay]);
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(null);
      if (purposeRef.current && !purposeRef.current.contains(e.target))
        setShowPurposeDrop(false);
      if (destRef.current && !destRef.current.contains(e.target))
        setShowDestDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSaveNote = async () => {
    if (isPast) {
      setError("이전 날짜의 비고는 수정할 수 없습니다.");
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
    if (isAnyLocked) {
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
    if (isAnyLocked) {
      setError("잠긴 주입니다. 입력할 수 없습니다.");
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
    if (isAnyLocked) {
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

  // 법인카드 모달
  const openReceiptAdd = () => {
    if (isAnyLocked) {
      setError("잠긴 주입니다. 입력할 수 없습니다.");
      return;
    }
    setError("");
    setEditTarget(null);
    setReceiptForm({
      date: TODAY,
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
    let lastM = 0;
    const withDist = sorted.map((d) => {
      const m = d.meterReading || 0;
      let dist = 0;
      if (m > 0 && lastM > 0 && m > lastM) dist = m - lastM;
      if (m > 0) lastM = m;
      return { ...d, calcDist: dist };
    });

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
      d.arrivalTime || "",
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
    let lastM = 0;
    const withDist = sorted.map((d) => {
      const m = d.meterReading || 0;
      let dist = 0;
      if (m > 0 && lastM > 0 && m > lastM) dist = m - lastM;
      if (m > 0) lastM = m;
      return { ...d, calcDist: dist };
    });

    const typeColor = { 업무: "#1557b0", 주유: "#92400e", 휴가: "#9d174d" };
    const rows = withDist
      .map(
        (d) => `
      <tr>
        <td>${d.date}</td>
        <td style="color:${typeColor[d.type] || "#333"};font-weight:bold">${d.type}</td>
        <td>${d.arrivalTime || ""}</td>
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
    let lastMeter = prevMeter;
    return sorted.map((d) => {
      let dist = 0;
      if (d.meterReading > 0 && lastMeter > 0 && d.meterReading > lastMeter) {
        dist = d.meterReading - lastMeter;
      }
      if (d.meterReading > 0) lastMeter = d.meterReading;
      return { ...d, distance: dist };
    });
  })();

  const dayMeters = recalcDayDriving
    .map((d) => d.meterReading)
    .filter((m) => m > 0);
  const endMeter = dayMeters.length ? Math.max(...dayMeters) : 0;
  const totalKm = recalcDayDriving.reduce((s, d) => s + (d.distance || 0), 0);
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
              {!isThisWeek
                ? "이번 주가 아닙니다."
                : `${selectedWeekNum}주차 기록이 잠겨있습니다.`}
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
        <div className="alert alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" onClick={() => setSuccess("")}>
          ✅ {success}
        </div>
      )}

      {/* 메인 탭 */}
      <div className="gf-tab-bar" style={{ marginBottom: "14px" }}>
        <button
          className={`gf-tab ${mainTab === "driving" ? "active" : ""}`}
          onClick={() => setMainTab("driving")}
        >
          📋 운행일지
        </button>
        <button
          className={`gf-tab ${mainTab === "receipt" ? "active" : ""}`}
          onClick={() => setMainTab("receipt")}
        >
          💳 법인카드
        </button>
      </div>

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
                // 이번 주 날짜인지 체크
                const wNum = getWeekNumForDate(d);
                const isCurrentWeek =
                  wNum === todayWeekNum &&
                  year === now.getFullYear() &&
                  month === now.getMonth() + 1;
                const wLocked = weekLocks[wNum] === true;
                const disabled = wLocked || !isCurrentWeek;
                return (
                  <option
                    key={d}
                    value={d}
                    disabled={disabled}
                    style={{ color: disabled ? "#ccc" : "inherit" }}
                  >
                    {month}월 {day}일{isT ? " (오늘)" : ""}
                    {hasEntry ? " ●" : ""}
                    {disabled && !wLocked ? " (이번 주 아님)" : ""}
                    {wLocked ? " 🔒" : ""}
                  </option>
                );
              })}
            </select>
            {monthDriving.length > 0 && (
              <>
                <button
                  className="btn-outline"
                  onClick={downloadDrivingExcel}
                  style={{ fontSize: "12px", padding: "7px 12px" }}
                >
                  📥 엑셀
                </button>
                <button
                  className="btn-outline"
                  onClick={printDriving}
                  style={{ fontSize: "12px", padding: "7px 12px" }}
                >
                  🖨 인쇄
                </button>
              </>
            )}
            {!isAnyLocked && isThisWeek && (
              <button className="btn-primary" onClick={openAdd}>
                ＋ 추가
              </button>
            )}
            {!isThisWeek && isWeekLocked && !isLocked && (
              <span
                style={{ fontSize: "12px", color: "#bbb", padding: "0 4px" }}
              >
                이번 주가 아닙니다 (조회만)
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
                        {!isAnyLocked && isThisWeek && <th style={thS}></th>}
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
                                  ⏰ {d.arrivalTime}
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
                            {!isLocked && isToday && (
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
                              ⏰ {d.arrivalTime}
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
                        {!isLocked && isToday && (
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
          {(dayDriving.length > 0 || isThisWeek) && (
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
                {isPast ? (
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
                      className="btn-primary"
                      onClick={handleSaveNote}
                      disabled={noteSaving}
                      style={{ padding: "7px 12px", fontSize: "12px" }}
                    >
                      {noteSaving ? "..." : "저장"}
                    </button>
                    <button
                      className="btn-outline"
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
                    className="btn-outline"
                    onClick={downloadReceiptExcel}
                    style={{ fontSize: "12px", padding: "7px 12px" }}
                  >
                    📥 엑셀
                  </button>
                  <button
                    className="btn-outline"
                    onClick={printReceipt}
                    style={{ fontSize: "12px", padding: "7px 12px" }}
                  >
                    🖨 인쇄
                  </button>
                </>
              )}
              {!isLocked && (
                <button className="btn-primary" onClick={openReceiptAdd}>
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
                    {!isLocked && (
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
                            <DotMenu
                              id={`r-${r.id}`}
                              onEdit={() => openReceiptEdit(r)}
                              onDelete={() => handleDeleteReceipt(r.id)}
                            />
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
        <div className="modal-bg" style={{ alignItems: "center" }}>
          <div
            className="modal"
            style={{ width: "480px", borderRadius: "14px", maxHeight: "90vh" }}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>
                운행일지 {editTarget ? "수정" : "추가"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitDriving} className="modal-form">
              {/* 날짜 - 업무/주유는 단일, 휴가는 범위 */}
              {drivingForm.type !== "휴가" ? (
                <div className="field">
                  <label>날짜 *</label>
                  <input
                    type="date"
                    value={drivingForm.startDate || ""}
                    min={THIS_WEEK_MONDAY}
                    max={THIS_WEEK_SUNDAY}
                    onChange={(e) =>
                      setDrivingForm((f) => ({
                        ...f,
                        startDate: e.target.value,
                        endDate: "",
                      }))
                    }
                    required
                  />
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div className="field">
                      <label>시작 날짜 *</label>
                      <input
                        type="date"
                        value={drivingForm.startDate || ""}
                        min={THIS_WEEK_MONDAY}
                        max={THIS_WEEK_SUNDAY}
                        onChange={(e) =>
                          setDrivingForm((f) => ({
                            ...f,
                            startDate: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="field">
                      <label>
                        종료 날짜{" "}
                        <span
                          style={{
                            color: "#aaa",
                            fontWeight: 400,
                            fontSize: "11px",
                          }}
                        >
                          (당일이면 생략)
                        </span>
                      </label>
                      <input
                        type="date"
                        value={drivingForm.endDate || ""}
                        min={drivingForm.startDate || ""}
                        onChange={(e) =>
                          setDrivingForm((f) => ({
                            ...f,
                            endDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  {drivingForm.startDate &&
                    drivingForm.endDate &&
                    drivingForm.endDate > drivingForm.startDate && (
                      <div
                        style={{
                          background: "#fce7f3",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          color: "#9d174d",
                          fontWeight: 600,
                        }}
                      >
                        🏖 {drivingForm.startDate} ~ {drivingForm.endDate}{" "}
                        기간으로 저장됩니다.
                      </div>
                    )}
                </>
              )}

              {/* 업무 */}
              {drivingForm.type === "업무" && (
                <>
                  <div className="field">
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#1557b0",
                      }}
                    >
                      🕐 도착 시간 *
                    </label>
                    <input
                      type="time"
                      value={drivingForm.arrivalTime}
                      onChange={(e) =>
                        setDrivingForm((f) => ({
                          ...f,
                          arrivalTime: e.target.value,
                        }))
                      }
                      required
                      style={{
                        fontSize: "16px",
                        padding: "12px",
                        letterSpacing: "1px",
                      }}
                    />
                  </div>
                  <div
                    className="field"
                    style={{ position: "relative" }}
                    ref={destRef}
                  >
                    <label>도착지 *</label>
                    <input
                      type="text"
                      placeholder="경복궁"
                      value={drivingForm.destination}
                      autoComplete="off"
                      required
                      onChange={(e) => {
                        setDrivingForm((f) => ({
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
                                  setDrivingForm((f) => ({
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
                    <label>
                      미터기 (km) *{" "}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#1557b0",
                          fontWeight: 400,
                        }}
                      >
                        현재 기준: {fmt(lastMeter)}km 이상
                      </span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="오늘 계량기"
                        value={drivingForm.meterReading}
                        onChange={(e) =>
                          setDrivingForm((f) => ({
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
                        ⚠ 이전 미터기({fmt(lastMeter)}km)보다 낮습니다!
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
                          setDrivingForm((f) => ({
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
                    {(drivingForm.notes || [{ content: "", time: "" }]).map(
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
                              const newNotes = [...(drivingForm.notes || [])];
                              newNotes[i] = {
                                ...newNotes[i],
                                time: e.target.value,
                              };
                              setDrivingForm((f) => ({
                                ...f,
                                notes: newNotes,
                              }));
                            }}
                            style={{ width: "110px" }}
                          />
                          <input
                            type="text"
                            placeholder={`비고 ${i + 1}`}
                            value={note.content || ""}
                            onChange={(e) => {
                              const newNotes = [...(drivingForm.notes || [])];
                              newNotes[i] = {
                                ...newNotes[i],
                                content: e.target.value,
                              };
                              setDrivingForm((f) => ({
                                ...f,
                                notes: newNotes,
                              }));
                            }}
                            style={{ flex: 1 }}
                          />
                          {(drivingForm.notes || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newNotes = (
                                  drivingForm.notes || []
                                ).filter((_, idx) => idx !== i);
                                setDrivingForm((f) => ({
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
              {drivingForm.type === "주유" && (
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
                            value={drivingForm.fuelAmount}
                            onChange={(e) =>
                              setDrivingForm((f) => ({
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
                            value={drivingForm.fuelCost}
                            onChange={(e) =>
                              setDrivingForm((f) => ({
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
                            value={drivingForm.fuelUnitPrice}
                            onChange={(e) =>
                              setDrivingForm((f) => ({
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

              {/* 휴가 */}
              {drivingForm.type === "휴가" && (
                <>
                  <div className="field">
                    <label>미터기 (km) *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="오늘 계량기"
                        value={drivingForm.meterReading}
                        onChange={(e) =>
                          setDrivingForm((f) => ({
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
                        ⚠ 이전 미터기({fmt(lastMeter)}km)보다 낮습니다!
                      </p>
                    )}
                  </div>

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
                      ⛽ 개인 주유 (선택)
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
                            value={drivingForm.fuelAmount}
                            onChange={(e) =>
                              setDrivingForm((f) => ({
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
                            value={drivingForm.fuelCost}
                            onChange={(e) =>
                              setDrivingForm((f) => ({
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
                            value={drivingForm.fuelUnitPrice}
                            onChange={(e) =>
                              setDrivingForm((f) => ({
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

              {/* 구분 - 맨 아래 */}
              <div className="field">
                <label>구분 *</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {TYPES.map((t) => {
                    const c = TYPE_STYLE[t];
                    const isActive = drivingForm.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setDrivingForm((f) => ({
                            ...f,
                            type: t,
                            destination: "",
                            arrivalTime: "",
                            fuelAmount: "",
                            fuelCost: "",
                            fuelUnitPrice: "",
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: "10px",
                          border: `1.5px solid ${isActive ? c.color : "#e0e0e0"}`,
                          borderRadius: "8px",
                          fontSize: "13px",
                          cursor: "pointer",
                          fontWeight: isActive ? 700 : 400,
                          background: isActive ? c.bg : "#fff",
                          color: isActive ? c.color : "#888",
                        }}
                      >
                        {t === "주유" ? "⛽ " : t === "휴가" ? "🏖 " : "💼 "}
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

      {/* ──── 법인카드 모달 ──── */}
      {showReceiptModal && (
        <div className="modal-bg" style={{ alignItems: "center" }}>
          <div
            className="modal"
            style={{ width: "440px", borderRadius: "14px", maxHeight: "90vh" }}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ margin: 0 }}>
                지출내역 {editTarget ? "수정" : "추가"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowReceiptModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitReceipt} className="modal-form">
              <div className="field">
                <label>날짜</label>
                <input
                  type="date"
                  value={receiptForm.date}
                  min={TODAY}
                  max={TODAY}
                  onChange={(e) =>
                    setReceiptForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>카테고리</label>
                <select
                  value={receiptForm.category}
                  onChange={(e) =>
                    setReceiptForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  {categories.length === 0 ? (
                    <option value="">없음</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="field">
                <label>신용카드 번호</label>
                <input
                  type="text"
                  value={receiptForm.content}
                  onChange={(e) =>
                    setReceiptForm((f) => ({ ...f, content: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>총금액 *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    value={receiptForm.amount}
                    onChange={(e) =>
                      setReceiptForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    style={{ width: "100%", paddingRight: "36px" }}
                    required
                  />
                  <span style={unitSuffix}>원</span>
                </div>
              </div>
              {receiptBase > 0 && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ color: "#555" }}>공급가액</span>
                    <strong style={{ color: "#1557b0" }}>
                      {fmtWon(supplyPreview)}
                    </strong>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ color: "#555" }}>VAT 10%</span>
                    <strong style={{ color: "#059669" }}>
                      {fmtWon(vatPreview)}
                    </strong>
                  </div>
                </div>
              )}
              <div className="field">
                <label>
                  사업자번호{" "}
                  <span
                    style={{ color: "#aaa", fontSize: "11px", fontWeight: 400 }}
                  >
                    (선택)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="000-00-00000"
                  value={receiptForm.businessNumber}
                  onChange={(e) =>
                    setReceiptForm((f) => ({
                      ...f,
                      businessNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label>
                  상호{" "}
                  <span
                    style={{ color: "#aaa", fontSize: "11px", fontWeight: 400 }}
                  >
                    (선택)
                  </span>
                </label>
                <input
                  type="text"
                  value={receiptForm.companyName}
                  onChange={(e) =>
                    setReceiptForm((f) => ({
                      ...f,
                      companyName: e.target.value,
                    }))
                  }
                />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowReceiptModal(false)}
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
const unitSuffix = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "13px",
  color: "#888",
  fontWeight: 600,
  pointerEvents: "none",
};
