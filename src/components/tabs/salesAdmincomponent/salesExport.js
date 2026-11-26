import * as XLSX from "xlsx";
import { formatDrivingTime } from "./DrivingTimeFields";
import { fmt, calcDistances, sumDist, isPersonal } from "./salesShared";

// 📥 엑셀 · 🖨 인쇄 (영업 정산 · 영업 정산관리 공용)
//   author : 작성자 (아이디)
//   driving / receipts : 그 달 운행일지 / 법인카드 목록
//   startMeter : 지난달 마지막 미터기 (없으면 시작 미터기) → 그 달 첫 운행거리도 화면과 같게 계산

// 운행일지 엑셀 다운로드 (월 전체)
export const downloadDrivingExcel = ({ year, month, author, driving, startMeter }) => {
  const wb = XLSX.utils.book_new();

  // 미터기 기반 거리 재계산 (월 전체, 지난달 마지막 미터기부터)
  const sorted = [...driving].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.arrivalTime) return 1;
    if (!b.arrivalTime) return -1;
    return a.arrivalTime.localeCompare(b.arrivalTime);
  });
  const distMap = calcDistances(sorted, startMeter);
  const withDist = sorted.map((d) => ({
    ...d,
    calcDist: distMap[d.id] || 0,
  }));

  const titleRow = [[`${year}년 ${month}월 운행일지`]];
  const infoRow = [[`작성자: ${author}`, "", "", "", "", "", "", ""]];
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
  XLSX.writeFile(wb, `${year}년_${month}월_운행일지_${author}.xlsx`);
};

// 운행일지 인쇄 (월 전체)
export const printDriving = ({ year, month, author, driving, startMeter }) => {
  const sorted = [...driving].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (!a.arrivalTime) return 1;
    if (!b.arrivalTime) return -1;
    return a.arrivalTime.localeCompare(b.arrivalTime);
  });
  const distMap = calcDistances(sorted, startMeter);
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
      <div class="info">작성자: ${author}</div>
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

// 카드 사용 "내 용" 칸: 사용 이유만 (카테고리는 안 씀)
//   법인 → "거래처 미팅" / 개인사용 → "개인사용 - 개인 식사" (이유 없으면 "개인사용")
export const receiptText = (r) => {
  const text = (r.note || "").trim();
  if (isPersonal(r)) return text ? `개인사용 - ${text}` : "개인사용";
  return text;
};
// 합계: 법인 / 개인사용 / 전체 – [{ label, totalAmount, supplyAmount, vat }]
export const receiptTotals = (receipts) => {
  const sum = (list) => ({
    totalAmount: list.reduce((s, r) => s + (r.totalAmount || 0), 0),
    supplyAmount: list.reduce((s, r) => s + (r.supplyAmount || 0), 0),
    vat: list.reduce((s, r) => s + (r.vat || 0), 0),
  });
  return [
    { label: "법인 합계", ...sum(receipts.filter((r) => !isPersonal(r))) },
    { label: "개인사용 합계", ...sum(receipts.filter(isPersonal)) },
    { label: "합  계", ...sum(receipts) },
  ];
};
const escHtml = (v) =>
  String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);

// 법인카드 엑셀 다운로드
export const downloadReceiptExcel = ({ year, month, author, receipts }) => {
  const wb = XLSX.utils.book_new();
  const titleRow = [["신용카드 매출전표 등 수취금액 합계표"]];
  const infoRow = [
    [
      `20${String(year).slice(2)}  년  ${month}  월`,
      "",
      `작성자: ${author}`,
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
    receiptText(r),
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
  const totalRows = receiptTotals(receipts).map((t) => [
    t.label,
    "",
    "",
    t.totalAmount,
    t.supplyAmount,
    t.vat,
    "",
    "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    ...titleRow,
    ...infoRow,
    ...colHeader,
    ...dataRows,
    ...emptyRows,
    ...totalRows,
  ]);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 28 }, // 내 용 (사용 이유)
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
    `${year}년_${month}월_신용카드매출전표_${author}.xlsx`,
  );
};

// 법인카드 인쇄
export const printReceipt = ({ year, month, author, receipts }) => {
  const fmt = (n) => Number(n || 0).toLocaleString();
  // 카드번호는 다 같은 카드라 표 위에 한 번만 (여러 개면 쉼표로)
  const cards = [...new Set(receipts.map((r) => (r.content || "").trim()).filter(Boolean))];
  const rows = receipts
    .map(
      (r) => `
      <tr>
        <td style="text-align:center">${r.date ? r.date.slice(5) : ""}</td>
        <td>${escHtml(receiptText(r))}</td>
        <td style="text-align:right">${r.totalAmount ? fmt(r.totalAmount) : ""}</td>
        <td style="text-align:right">${r.supplyAmount ? fmt(r.supplyAmount) : ""}</td>
        <td style="text-align:right">${r.vat ? fmt(r.vat) : ""}</td>
        <td>${r.businessNumber || ""}</td>
        <td class="co">${escHtml(r.companyName || "")}</td>
      </tr>`,
    )
    .join("");
  const emptyRows = Array.from(
    { length: Math.max(0, 22 - receipts.length) },
    () =>
      `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`,
  ).join("");
  // 합계: 법인 / 개인사용 / 전체 (첫 줄 위에 굵은 선)
  const total = receiptTotals(receipts)
    .map((t, i) => {
      const line = i === 0 ? ";border-top:2px solid #000" : "";
      return `<tr style="font-weight:bold">
      <td colspan="2" style="text-align:center${line}">${t.label}</td>
      <td style="text-align:right${line}">${fmt(t.totalAmount)}</td>
      <td style="text-align:right${line}">${fmt(t.supplyAmount)}</td>
      <td style="text-align:right${line}">${fmt(t.vat)}</td>
      <td style="${line.slice(1)}"></td>
      <td style="${line.slice(1)}"></td>
    </tr>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: '맑은 고딕', sans-serif; padding: 8mm; }
        h2 { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 6px; letter-spacing: 1px; }
        .info { font-size: 10pt; margin-bottom: 6px; display: flex; gap: 30px; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th { border: 1.5px solid #000; padding: 5px 4px; text-align: center; font-weight: bold; background: #fff; }
        td { border: 1px solid #000; padding: 4px; height: 22px; }
        /* 날짜 · 내용 · 총금액 · 공급가액 · VAT · 사업자번호 · 상호 */
        th:nth-child(1) { width: 7%; }
        th:nth-child(2) { width: 27%; }
        th:nth-child(3) { width: 9%; }
        th:nth-child(4) { width: 9%; }
        th:nth-child(5) { width: 7%; }
        th:nth-child(6) { width: 13%; }
        th:nth-child(7) { width: 28%; }
        td.co { font-size: 10.5pt; font-weight: bold; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { padding: 0; }
        }
      </style></head><body>
      <h2>신용카드 매출전표 등 수취금액 합계표</h2>
      <div class="info">
        <span>20&nbsp;&nbsp;&nbsp;년&nbsp;&nbsp;&nbsp;${month}&nbsp;&nbsp;&nbsp;월</span>
        <span>작성자: ${author}</span>
        <span>신용카드 번호: ${escHtml(cards.join(", "))}</span>
      </div>
      <table style="table-layout:fixed">
        <thead><tr>
          <th>날 짜</th>
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
