// 영업 정산 / 영업 정산관리 📥 엑셀 · 🖨 인쇄 결과 테스트
// - 영업 정산 화면의 엑셀 내용(시트)과 인쇄 화면(HTML)을 스냅샷으로 기록
// - 영업 정산관리에서 같은 사람·같은 달을 뽑으면 결과가 똑같아야 함
import { render, screen, fireEvent } from "@testing-library/react";
import * as XLSX from "xlsx";
import SalesContent from "./SalesContent";
import SalesAdminContent from "./SalesAdminContent";
import { salesApi, salesAdminApi } from "../../../api/sales";

jest.mock("xlsx", () => ({ ...jest.requireActual("xlsx"), writeFile: jest.fn() }));
jest.mock("../../../api/sales", () => {
  const ok = (data) => () => Promise.resolve({ data });
  const DRIVING = [
    { id: 1, date: "2026-10-20", type: "업무", destination: "시청", departureTime: "07:00", arrivalTime: "08:00", meterReading: 900, purpose: "미팅", fuelAmount: 0, fuelCost: 0, fuelUnitPrice: 0 },
    { id: 3, date: "2026-10-21", type: "주유", meterReading: 950, fuelAmount: 30.5, fuelCost: 50000, fuelUnitPrice: 1639 },
    { id: 4, date: "2026-10-21", type: "개인주유", meterReading: null, fuelAmount: 10, fuelCost: 17000, fuelUnitPrice: 1700 },
    { id: 2, date: "2026-10-22", type: "업무", destination: "명동", departureTime: "08:00", arrivalTime: "09:00", meterReading: 1000, purpose: "", fuelAmount: 0, fuelCost: 0, fuelUnitPrice: 0 },
    { id: 5, date: "2026-10-22", type: "개인사용", meterReading: 1040, fuelAmount: 0, fuelCost: 0, fuelUnitPrice: 0 },
  ];
  const RECEIPTS = [
    { id: 5, date: "2026-10-22", category: "식대", content: "1234-5678", totalAmount: 11000, supplyAmount: 10000, vat: 1000, businessNumber: "123-45-67890", companyName: "식당" },
    { id: 6, date: "2026-10-23", category: "주차", content: "1234-5678", totalAmount: 5500, supplyAmount: 5000, vat: 500, businessNumber: "", companyName: "주차장" },
  ];
  const common = {
    getLockStatus: ok({ locked: false, weekLocks: { 1: true, 2: true, 3: true, 4: false, 5: true } }),
    getCategories: ok([]),
    getDestinations: ok([]),
    getDriving: ok(DRIVING),
    getDrivingDate: (...args) => Promise.resolve({ data: DRIVING.filter((d) => d.date === args[args.length - 1]) }),
    getPrevMeter: ok({ prevMeter: 850 }),
    getReceipts: ok(RECEIPTS),
    getPersonalFuelBalance: ok(null),
  };
  return {
    salesApi: {
      ...common,
      getMyCard: ok({ cardNumber: "1234-5678" }),
      getDailyNote: ok({ note: "" }),
      getStartMeter: ok({ startMeter: 800, needed: false }),
    },
    salesAdminApi: {
      ...common,
      getSummary: ok([{ username: "kim", name: "김영업", hasData: true, receiptCount: 2 }]),
      getDailyNotes: ok([]),
    },
  };
});

// 2026-10-22(목) 오전 10:30 (한국 시간) 으로 고정
const NOW = new Date("2026-10-22T10:30:00+09:00");
const RealDate = Date;
class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(NOW.getTime());
    else super(...args);
  }
  static now() {
    return NOW.getTime();
  }
}

let printed;
beforeEach(() => {
  global.Date = FixedDate;
  XLSX.writeFile.mockClear();
  printed = [];
  window.open = jest.fn(() => ({
    document: { write: (html) => printed.push(html), close: () => {} },
  }));
  sessionStorage.setItem("username", "kim");
});
afterEach(() => {
  global.Date = RealDate;
});

// 엑셀: 파일 이름 + 시트 이름 + 칸 내용
const lastExcel = () => {
  const [wb, fileName] = XLSX.writeFile.mock.calls.at(-1);
  const sheetName = wb.SheetNames[0];
  return { fileName, sheetName, rows: XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }), sheet: wb.Sheets[sheetName] };
};

// 운행일지 / 법인카드 탭에서 엑셀 · 인쇄를 눌러 결과를 모음
async function collect(openReceiptTab) {
  const out = {};
  fireEvent.click(await screen.findByText("📥 엑셀"));
  out.drivingExcel = lastExcel();
  fireEvent.click(screen.getByText("🖨 인쇄"));
  out.drivingPrint = printed.at(-1);
  openReceiptTab();
  fireEvent.click(await screen.findByText("📥 엑셀"));
  out.receiptExcel = lastExcel();
  fireEvent.click(screen.getByText("🖨 인쇄"));
  out.receiptPrint = printed.at(-1);
  return out;
}

async function salesOutput() {
  render(<SalesContent />);
  await screen.findAllByText("명동", undefined, { timeout: 3000 });
  return collect(() => fireEvent.click(screen.getByText("💳 법인카드")));
}

test("영업 정산 – 엑셀 · 인쇄 결과", async () => {
  const out = await salesOutput();
  expect(out).toMatchSnapshot();
});

test("영업 정산관리 – 같은 사람 · 같은 달이면 영업 정산과 결과가 똑같음", async () => {
  const sales = await salesOutput();
  document.body.innerHTML = "";

  render(<SalesAdminContent />);
  fireEvent.click(await screen.findByText("김영업"));
  await screen.findAllByText("명동", undefined, { timeout: 3000 });
  const admin = await collect(() =>
    fireEvent.click(screen.getAllByText("💳 법인카드").find((el) => el.tagName === "BUTTON")),
  );
  expect(admin).toEqual(sales);
  expect(printed).toHaveLength(4);
});
