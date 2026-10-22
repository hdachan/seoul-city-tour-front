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
  // 실제 서버와 같은 형태: 2026년 10월 4주차(19~25일)=이번 주 열림, 나머지 잠김
  api.getLockStatus.mockImplementation(() =>
    ok({ locked: false, weekLocks: { 1: true, 2: true, 3: true, 4: false, 5: true } }),
  );
  api.getCategories.mockImplementation(() => ok(CATEGORIES));
  api.getPurposes.mockImplementation(() => ok([]));
  api.getDestinations.mockImplementation(() => ok([]));
  api.getDriving.mockImplementation(() => ok(DRIVING));
  // 마지막 인자가 날짜 (영업: (date), 관리자: (username, date))
  api.getDrivingDate.mockImplementation((...args) =>
    ok(DRIVING.filter((d) => d.date === args[args.length - 1])),
  );
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
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
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
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1050");
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
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "950");
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

// ───────────── 💼 영업 정산 – 입력 가능 날짜 규칙 (열린 주만, 이번 주 일요일까지) ─────────────
describe("영업 정산 – 입력 가능 날짜", () => {
  // 10월 3주차(12~18일)를 관리자가 다시 열어준 상황
  const reopenWeek3 = () =>
    salesApi.getLockStatus.mockImplementation(() =>
      ok({ locked: false, weekLocks: { 1: true, 2: true, 3: false, 4: false, 5: true } }),
    );
  const daySelect = () =>
    screen.getAllByRole("combobox").find((el) => [...el.options].some((o) => o.value === "2026-10-15"));
  async function openAt(date) {
    render(<SalesContent />);
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
    if (date) {
      await act(async () => {
        fireEvent.change(daySelect(), { target: { value: date } });
      });
    }
  }

  test("잠긴 지난 주 → 추가 버튼 없음, 조회만", async () => {
    await openAt("2026-10-15");
    expect(screen.queryByText("＋ 추가")).toBeNull();
    expect(screen.getByText(/🔒 잠긴 주/)).toBeInTheDocument();
  });

  test("관리자가 다시 연 지난 주 → 입력 가능 (날짜는 그 주 안에서)", async () => {
    reopenWeek3();
    await openAt("2026-10-15");
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const dateInput = modal().querySelector("input[type=date]");
    expect([dateInput.min, dateInput.max, dateInput.value]).toEqual(["2026-10-12", "2026-10-18", "2026-10-15"]);
    // 10/20 에 900km 기록이 있으므로 950 은 막히고 900 은 저장됨 (미터기 검사도 그대로)
    const meterInput = modal().querySelector("input[placeholder='계량기 숫자']");
    setValue(meterInput, "950");
    await submit();
    expect(salesApi.addDriving).not.toHaveBeenCalled();
    expect(modal().textContent).toContain("이후 날짜에 900km 기록이 있어");
    setValue(meterInput, "900");
    await submit();
    expect(salesApi.addDriving).toHaveBeenCalledTimes(1);
    expect(salesApi.addDriving.mock.calls[0][0].date).toBe("2026-10-15");
  });

  test("이번 주 → 지금처럼 입력 가능 (19~25일)", async () => {
    await openAt();
    fireEvent.click(screen.getByText("＋ 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const dateInput = modal().querySelector("input[type=date]");
    expect([dateInput.min, dateInput.max]).toEqual(["2026-10-19", "2026-10-25"]);
  });

  test("법인카드 – 열린 주 날짜만 고를 수 있고, 잠긴 주 지출은 ··· 메뉴 없음", async () => {
    salesApi.getReceipts.mockImplementation(() =>
      ok([...RECEIPTS, { ...RECEIPTS[0], id: 6, date: "2026-10-06", content: "지난주" }]),
    );
    await openAt();
    fireEvent.click(screen.getByText("💳 법인카드"));
    await screen.findByText("＋ 지출내역");
    // 지출 2건(오늘 · 잠긴 주) 중 오늘 것만 메뉴가 있음 (PC 표 + 모바일 카드 = 2개)
    expect(screen.getAllByText("···")).toHaveLength(2);
    fireEvent.click(screen.getByText("＋ 지출내역"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const dateInput = modal().querySelector("input[type=date]");
    expect([dateInput.min, dateInput.max, dateInput.value]).toEqual(["2026-10-19", "2026-10-25", "2026-10-22"]);
  });

  test("법인카드 – 범위 안이라도 잠긴 주 날짜면 저장 안 됨", async () => {
    // 1주차 + 4주차만 열림 → 고를 수 있는 범위(1~25일) 안에 잠긴 2·3주차가 끼어 있음
    salesApi.getLockStatus.mockImplementation(() =>
      ok({ locked: false, weekLocks: { 1: false, 2: true, 3: true, 4: false, 5: true } }),
    );
    await openAt();
    fireEvent.click(screen.getByText("💳 법인카드"));
    fireEvent.click(await screen.findByText("＋ 지출내역"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const dateInput = modal().querySelector("input[type=date]");
    expect([dateInput.min, dateInput.max]).toEqual(["2026-10-01", "2026-10-25"]);
    setValue(dateInput, "2026-10-14");
    setValue(modal().querySelector("input[type=number]"), "5000");
    await submit();
    expect(salesApi.addReceipt).not.toHaveBeenCalled();
    expect(modal().textContent).toContain("잠긴 주의 날짜입니다");
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
