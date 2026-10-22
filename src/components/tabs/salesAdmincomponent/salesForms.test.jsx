// 영업 정산 / 영업 정산관리 입력창(운행일지 · 법인카드) "지금 동작 기록" 테스트
// - 입력창 화면(HTML)을 스냅샷으로 저장하고
// - 저장 버튼을 누르면 서버로 어떤 값이 가는지 그대로 확인함
// 코드를 정리한 뒤에도 이 테스트가 전부 통과해야 동작이 그대로인 것
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SalesContent from "./SalesContent";
import SalesAdminContent from "./SalesAdminContent";
import { salesApi, salesAdminApi } from "../../../api/sales";

jest.mock("../../../api/sales", () => {
  const fns = (names) => Object.fromEntries(names.map((n) => [n, jest.fn()]));
  const common = [
    "getLockStatus", "getCategories", "getPurposes", "getDestinations",
    "getDriving", "getDrivingDate", "getPrevMeter", "addDriving",
    "updateDriving", "deleteDriving", "saveDrivingNotes", "getReceipts",
    "addReceipt", "updateReceipt", "deleteReceipt", "getPersonalFuelBalance",
  ];
  return {
    salesApi: fns([...common, "getMyCard", "getDrivingNotes", "getDailyNote", "saveDailyNote"]),
    salesAdminApi: fns([...common, "getSalesUsers", "getSummary", "toggleLock", "addCategory", "deleteCategory", "getDailyNotes"]),
  };
});

// 2026-10-22(목) 오전 10:30 (한국 시간) 으로 고정
const NOW = new Date("2026-10-22T10:30:00+09:00");

const ok = (data) => Promise.resolve({ data });
const DRIVING = [
  {
    id: 1, date: "2026-10-20", type: "업무", destination: "시청", departureTime: "07:00",
    arrivalTime: "08:00", meterReading: 900, purpose: "", notes: [],
    fuelAmount: 0, fuelCost: 0, fuelUnitPrice: 0,
  },
  {
    id: 2, date: "2026-10-22", type: "업무", destination: "명동", departureTime: "08:00",
    arrivalTime: "09:00", meterReading: 1000, purpose: "",
    notes: [{ content: "고객방문", time: "08:30" }],
    fuelAmount: 0, fuelCost: 0, fuelUnitPrice: 0,
  },
];
const RECEIPTS = [
  {
    id: 5, date: "2026-10-22", category: "식대", content: "점심", totalAmount: 11000,
    supplyAmount: 10000, vatAmount: 1000, businessNumber: "123-45-67890", companyName: "식당",
  },
];
const CATEGORIES = [{ id: 1, name: "식대" }, { id: 2, name: "주차" }];

function setupApi(api) {
  api.getLockStatus.mockImplementation(() => ok({ locked: false, weekLocks: {} }));
  api.getCategories.mockImplementation(() => ok(CATEGORIES));
  api.getPurposes.mockImplementation(() => ok([]));
  api.getDestinations.mockImplementation(() => ok([]));
  api.getDriving.mockImplementation(() => ok(DRIVING));
  api.getDrivingDate.mockImplementation(() => ok(DRIVING.filter((d) => d.date === "2026-10-22")));
  api.getPrevMeter.mockImplementation(() => ok({ prevMeter: 900 }));
  api.getReceipts.mockImplementation(() => ok(RECEIPTS));
  api.addDriving.mockImplementation(() => ok({ id: 99 }));
  api.updateDriving.mockImplementation(() => ok({ id: 2 }));
  api.saveDrivingNotes.mockImplementation(() => ok({}));
  api.addReceipt.mockImplementation(() => ok({}));
  api.updateReceipt.mockImplementation(() => ok({}));
  api.getPersonalFuelBalance.mockImplementation(() => ok(null));
}

// 현재 시각만 고정 (new Date() / Date.now() 가 NOW 를 돌려줌, 타이머는 진짜 사용)
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

beforeEach(() => {
  global.Date = FixedDate;
  jest.clearAllMocks();
  setupApi(salesApi);
  setupApi(salesAdminApi);
  salesApi.getMyCard.mockImplementation(() => ok({ cardNumber: "1234-5678" }));
  salesApi.getDailyNote.mockImplementation(() => ok({ note: "" }));
  salesAdminApi.getSummary.mockImplementation(() =>
    ok([{ username: "kim", name: "김영업", locked: false, hasData: true, receiptCount: 1 }]),
  );
  salesAdminApi.getDailyNotes.mockImplementation(() => ok([]));
  sessionStorage.setItem("username", "kim");
  window.confirm = jest.fn(() => true);
});
afterEach(() => {
  global.Date = RealDate;
});

const modal = () => document.querySelector(".modal");
// 입력창 화면(HTML) + 각 입력칸에 들어있는 값 (HTML 에는 입력값이 안 보여서 따로 기록)
const modalState = () => ({
  html: modal().outerHTML,
  values: [...modal().querySelectorAll("input, select, textarea")].map(
    (el) => `${el.tagName.toLowerCase()}[${el.type}] ${el.placeholder || ""} = ${el.value}`,
  ),
});
const modalForm = () => modal().querySelector("form");
const setValue = (el, value) => fireEvent.change(el, { target: { value } });
const typeButton = (name) =>
  [...modal().querySelectorAll("button[type=button]")].find((b) => b.textContent.trim().endsWith(name));
const submit = async () => {
  await act(async () => {
    fireEvent.submit(modalForm());
  });
};
// 행의 ··· 메뉴 → 수정
async function clickRowEdit(index = 0) {
  const dots = screen.getAllByText("···");
  fireEvent.click(dots[index]);
  fireEvent.click((await screen.findAllByText("수정"))[0]);
}

// ───────────────────────── 💼 영업 정산 ─────────────────────────
describe("영업 정산 (SalesContent)", () => {
  async function open() {
    render(<SalesContent />);
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
  }

  test("운행일지 추가 – 입력창 화면 (구분별)", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("업무");
    for (const t of ["주유", "개인주유", "개인사용", "업무"]) {
      fireEvent.click(typeButton(t));
      expect(modalState()).toMatchSnapshot(t);
    }
  });

  test("운행일지 추가 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(modal().querySelector("input[placeholder='오늘 계량기']"), "1100");
    await submit();
    expect(salesApi.addDriving).toHaveBeenCalledTimes(1);
    expect(salesApi.addDriving.mock.calls[0]).toMatchSnapshot();
    expect(salesApi.saveDrivingNotes.mock.calls).toMatchSnapshot("비고");
  });

  test("운행일지 개인사용 / 주유 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    fireEvent.click(typeButton("개인사용"));
    setValue(modal().querySelector("input[placeholder='오늘 계량기']"), "1050");
    expect(modalState()).toMatchSnapshot("개인사용 미터기 입력 후");
    await submit();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    fireEvent.click(typeButton("주유"));
    modal().querySelectorAll("input[type=number]").forEach((el, i) => setValue(el, String(10 + i)));
    expect(modalState()).toMatchSnapshot("주유 입력 후");
    await submit();
    expect(salesApi.addDriving.mock.calls).toMatchSnapshot();
  });

  test("운행일지 수정 – 입력창 화면 + 저장 값", async () => {
    await open();
    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("수정 입력창");
    await submit();
    expect(salesApi.updateDriving.mock.calls).toMatchSnapshot("updateDriving");
    expect(salesApi.saveDrivingNotes.mock.calls).toMatchSnapshot("saveDrivingNotes");
  });

  test("미터기 범위 검사 – 낮으면 저장 안 됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(modal().querySelector("input[placeholder='오늘 계량기']"), "950");
    await submit();
    expect(salesApi.addDriving).not.toHaveBeenCalled();
    expect(modalState()).toMatchSnapshot("미터기 낮음 경고");
  });

  test("법인카드 추가 / 수정 – 입력창 화면 + 저장 값", async () => {
    await open();
    fireEvent.click(screen.getByText("💳 법인카드"));
    fireEvent.click(await screen.findByText("＋ 지출내역"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("추가 입력창");
    const inputs = modal().querySelectorAll("input");
    inputs.forEach((el) => {
      if (el.type === "number") setValue(el, "22000");
      else if (el.type === "text") setValue(el, "테스트");
    });
    expect(modalState()).toMatchSnapshot("추가 입력 후");
    await submit();
    expect(salesApi.addReceipt.mock.calls).toMatchSnapshot("addReceipt");

    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("수정 입력창");
    await submit();
    expect(salesApi.updateReceipt.mock.calls).toMatchSnapshot("updateReceipt");
  });
});

// ───────────────────────── 📊 영업 정산관리 ─────────────────────────
describe("영업 정산관리 (SalesAdminContent)", () => {
  async function open() {
    render(<SalesAdminContent />);
    fireEvent.click(await screen.findByText("김영업"));
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
  }

  test("운행일지 추가 – 입력창 화면 (구분별)", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("업무");
    for (const t of ["주유", "개인주유", "개인사용", "업무"]) {
      fireEvent.click(typeButton(t));
      expect(modalState()).toMatchSnapshot(t);
    }
  });

  test("운행일지 추가 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    await submit();
    expect(salesAdminApi.addDriving).toHaveBeenCalledTimes(1);
    expect(salesAdminApi.addDriving.mock.calls[0]).toMatchSnapshot();
    expect(salesAdminApi.saveDrivingNotes.mock.calls).toMatchSnapshot("비고");
  });

  test("운행일지 개인사용 / 주유 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    fireEvent.click(typeButton("개인사용"));
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1050");
    expect(modalState()).toMatchSnapshot("개인사용 미터기 입력 후");
    await submit();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    fireEvent.click(typeButton("주유"));
    modal().querySelectorAll("input[type=number]").forEach((el, i) => setValue(el, String(10 + i)));
    expect(modalState()).toMatchSnapshot("주유 입력 후");
    await submit();
    expect(salesAdminApi.addDriving.mock.calls).toMatchSnapshot();
  });

  test("운행일지 수정 – 입력창 화면 + 저장 값", async () => {
    await open();
    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("수정 입력창");
    await submit();
    expect(salesAdminApi.updateDriving.mock.calls).toMatchSnapshot("updateDriving");
    expect(salesAdminApi.saveDrivingNotes.mock.calls).toMatchSnapshot("saveDrivingNotes");
  });

  test("미터기 범위 검사 – 낮으면 저장 안 됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "950");
    await submit();
    expect(salesAdminApi.addDriving).not.toHaveBeenCalled();
    expect(modalState()).toMatchSnapshot("미터기 낮음 경고");
  });

  test("법인카드 추가 / 수정 – 입력창 화면 + 저장 값", async () => {
    await open();
    fireEvent.click(screen.getByText("💳 법인카드"));
    fireEvent.click(await screen.findByText("＋ 지출내역"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("추가 입력창");
    const inputs = modal().querySelectorAll("input");
    inputs.forEach((el) => {
      if (el.type === "number") setValue(el, "22000");
      else if (el.type === "text") setValue(el, "테스트");
    });
    expect(modalState()).toMatchSnapshot("추가 입력 후");
    await submit();
    expect(salesAdminApi.addReceipt.mock.calls).toMatchSnapshot("addReceipt");

    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("수정 입력창");
    await submit();
    expect(salesAdminApi.updateReceipt.mock.calls).toMatchSnapshot("updateReceipt");
  });
});
