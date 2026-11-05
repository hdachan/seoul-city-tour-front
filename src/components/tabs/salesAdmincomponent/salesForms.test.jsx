/* eslint-disable testing-library/no-node-access, testing-library/no-unnecessary-act --
   입력창 화면(HTML)과 입력값을 통째로 기록하는 테스트라 DOM 을 직접 읽음 */
// 영업 정산 / 영업 정산관리 입력창(운행일지 · 법인카드) "지금 동작 기록" 테스트
// - 입력창 화면(HTML)을 스냅샷으로 저장하고
// - 저장 버튼을 누르면 서버로 어떤 값이 가는지 그대로 확인함
// 코드를 정리한 뒤에도 이 테스트가 전부 통과해야 동작이 그대로인 것
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SalesContent from "./SalesContent";
import SalesAdminContent from "./SalesAdminContent";
import SalesAdminStatsTab from "./SalesAdminStatsTab";
import { salesApi, salesAdminApi } from "../../../api/sales";

jest.mock("../../../api/sales", () => {
  const fns = (names) => Object.fromEntries(names.map((n) => [n, jest.fn()]));
  const common = [
    "getLockStatus", "getCategories", "getPurposes",
    "getDriving", "getDrivingDate", "getPrevMeter", "addDriving",
    "updateDriving", "deleteDriving", "saveDrivingNotes", "getReceipts",
    "addReceipt", "updateReceipt", "deleteReceipt", "getPersonalFuelBalance",
    "saveStartMeter",
  ];
  return {
    salesApi: fns([...common, "getMyCard", "saveMyCard", "getDrivingNotes", "getDailyNote", "saveDailyNote", "getStartMeter"]),
    salesAdminApi: fns([...common, "getSalesUsers", "getSummary", "toggleLock", "addCategory", "deleteCategory", "getDailyNotes", "saveCard"]),
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
  localStorage.clear();
  global.Date = FixedDate;
  jest.clearAllMocks();
  setupApi(salesApi);
  setupApi(salesAdminApi);
  salesApi.getMyCard.mockImplementation(() => ok({ cardNumber: "1234-5678" }));
  salesApi.getDailyNote.mockImplementation(() => ok({ note: "" }));
  salesApi.getStartMeter.mockImplementation(() => ok({ startMeter: 800, needed: false }));
  salesApi.saveStartMeter.mockImplementation(() => ok({}));
  salesAdminApi.saveStartMeter.mockImplementation(() => ok({}));
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

const modal = () => document.querySelector(".sl-modal");
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
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("업무");
    // 운행 창에는 주유가 없음
    expect(typeButton("주유")).toBeUndefined();
    for (const t of ["개인사용", "업무"]) {
      fireEvent.click(typeButton(t));
      expect(modalState()).toMatchSnapshot(t);
    }
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    fireEvent.click(screen.getByText("⛽ 주유 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("주유");
    // 주유 창에는 운행 구분이 없음
    expect(typeButton("업무")).toBeUndefined();
    fireEvent.click(typeButton("개인주유"));
    expect(modalState()).toMatchSnapshot("개인주유");
  });

  test("운행일지 추가 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    await submit();
    expect(salesApi.addDriving).toHaveBeenCalledTimes(1);
    expect(salesApi.addDriving.mock.calls[0]).toMatchSnapshot();
    expect(salesApi.saveDrivingNotes.mock.calls).toMatchSnapshot("비고");
  });

  test("운행일지 개인사용 / 주유 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    fireEvent.click(typeButton("개인사용"));
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1050");
    expect(modalState()).toMatchSnapshot("개인사용 미터기 입력 후");
    await submit();
    fireEvent.click(screen.getByText("⛽ 주유 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
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

  test("업무에서 비고를 적고 개인사용으로 바꾸면 비고는 저장 안 됨", async () => {
    await open();
    // 추가: 비고 적고 → 개인사용으로 바꿈
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(modal().querySelector("input.sl-note-text"), "자택");
    fireEvent.click(typeButton("개인사용"));
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1050");
    await submit();
    expect(salesApi.addDriving).toHaveBeenCalledTimes(1);
    expect(salesApi.addDriving.mock.calls[0][0].notes).toEqual([{ content: "", time: "" }]);
    expect(salesApi.saveDrivingNotes).not.toHaveBeenCalled();
    // 수정: 업무 기록을 개인사용으로 바꾸면 예전 비고를 지움
    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    fireEvent.click(typeButton("개인사용"));
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1050");
    await submit();
    expect(salesApi.saveDrivingNotes).toHaveBeenCalledWith(expect.anything(), []);
  });

  test("입력 임시 보관 – ✕ 로 닫으면 남고, 취소 · 저장하면 지움, 운행 · 주유 따로", async () => {
    await open();
    const openModal = async (name) => {
      fireEvent.click(screen.getByText(name));
      await waitFor(() => expect(modal()).not.toBeNull());
    };
    const meterInput = () => modal().querySelector("input[placeholder='계량기 숫자']");
    await openModal("＋ 운행 추가");
    expect(modal().textContent).not.toContain("불러왔어요");
    setValue(meterInput(), "1100");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    // 주유 창에는 안 섞임
    await openModal("⛽ 주유 추가");
    expect(modal().textContent).not.toContain("불러왔어요");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    // 다시 열면 불러옴
    await openModal("＋ 운행 추가");
    expect(modal().textContent).toContain("불러왔어요");
    expect(meterInput().value).toBe("1100");
    // 취소 버튼이면 지움
    fireEvent.click([...modal().querySelectorAll("button")].find((b) => b.textContent.trim() === "취소"));
    await openModal("＋ 운행 추가");
    expect(meterInput().value).toBe("");
    // 저장하면 지움
    setValue(meterInput(), "1100");
    await submit();
    expect(salesApi.addDriving).toHaveBeenCalledTimes(1);
    await openModal("＋ 운행 추가");
    expect(meterInput().value).toBe("");
    expect(modal().textContent).not.toContain("불러왔어요");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    // 수정 창은 보관 안 함
    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(meterInput(), "1234");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    await openModal("＋ 운행 추가");
    expect(meterInput().value).toBe("");
  });

  test("도착 시간이 출발 시간보다 빠르면 저장 안 됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const times = () => modal().querySelectorAll("input[type=time]");
    setValue(times()[0], "11:00");
    setValue(times()[1], "10:00");
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    await submit();
    expect(salesApi.addDriving).not.toHaveBeenCalled();
    expect(modal().textContent).toContain("도착 시간은 출발 시간(11:00)보다 빠를 수 없어요.");
    // 비고 시간도 잠김
    expect(modal().querySelector("input.sl-note-time").disabled).toBe(true);
    // 고치면 저장됨 (같은 시각도 됨)
    setValue(times()[1], "11:00");
    await submit();
    expect(salesApi.addDriving).toHaveBeenCalledTimes(1);
  });

  test("비고 시간 – 출발 · 도착을 먼저 적어야 하고, 그 사이만 저장됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const times = () => modal().querySelectorAll("input[type=time]");
    const noteTime = () => modal().querySelector("input.sl-note-time");
    // 처음엔 출발 · 도착이 비어 있고 비고 시간은 잠김
    expect(times()[0].value).toBe("");
    expect(times()[1].value).toBe("");
    expect(noteTime().disabled).toBe(true);
    setValue(times()[0], "09:00");
    expect(noteTime().disabled).toBe(true);
    setValue(times()[1], "12:00");
    expect(noteTime().disabled).toBe(false);
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    // 범위 밖이면 저장 안 됨
    setValue(noteTime(), "08:50");
    await submit();
    expect(salesApi.addDriving).not.toHaveBeenCalled();
    expect(modal().textContent).toContain("출발(09:00)~도착(12:00) 사이");
    setValue(noteTime(), "12:10");
    await submit();
    expect(salesApi.addDriving).not.toHaveBeenCalled();
    // 경계값은 저장됨
    setValue(noteTime(), "12:00");
    await submit();
    expect(salesApi.addDriving).toHaveBeenCalledTimes(1);
  });

  test("미터기 범위 검사 – 낮으면 저장 안 됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
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
    fireEvent.click(screen.getByText("＋ 운행 추가"));
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
    fireEvent.click(screen.getByText("＋ 운행 추가"));
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
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("업무");
    // 운행 창에는 주유가 없음
    expect(typeButton("주유")).toBeUndefined();
    for (const t of ["개인사용", "업무"]) {
      fireEvent.click(typeButton(t));
      expect(modalState()).toMatchSnapshot(t);
    }
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    fireEvent.click(screen.getByText("⛽ 주유 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(modalState()).toMatchSnapshot("주유");
    // 주유 창에는 운행 구분이 없음
    expect(typeButton("업무")).toBeUndefined();
    fireEvent.click(typeButton("개인주유"));
    expect(modalState()).toMatchSnapshot("개인주유");
  });

  test("운행일지 추가 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    await submit();
    expect(salesAdminApi.addDriving).toHaveBeenCalledTimes(1);
    expect(salesAdminApi.addDriving.mock.calls[0]).toMatchSnapshot();
    expect(salesAdminApi.saveDrivingNotes.mock.calls).toMatchSnapshot("비고");
  });

  test("운행일지 개인사용 / 주유 – 저장 시 서버로 가는 값", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    fireEvent.click(typeButton("개인사용"));
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1050");
    expect(modalState()).toMatchSnapshot("개인사용 미터기 입력 후");
    await submit();
    fireEvent.click(screen.getByText("⛽ 주유 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
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

  test("입력 임시 보관 – ✕ 로 닫으면 남고, 취소 · 저장하면 지움, 운행 · 주유 따로", async () => {
    await open();
    const openModal = async (name) => {
      fireEvent.click(screen.getByText(name));
      await waitFor(() => expect(modal()).not.toBeNull());
    };
    const meterInput = () => modal().querySelector("input[placeholder='계량기 숫자']");
    await openModal("＋ 운행 추가");
    expect(modal().textContent).not.toContain("불러왔어요");
    setValue(meterInput(), "1100");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    // 주유 창에는 안 섞임
    await openModal("⛽ 주유 추가");
    expect(modal().textContent).not.toContain("불러왔어요");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    // 다시 열면 불러옴
    await openModal("＋ 운행 추가");
    expect(modal().textContent).toContain("불러왔어요");
    expect(meterInput().value).toBe("1100");
    // 취소 버튼이면 지움
    fireEvent.click([...modal().querySelectorAll("button")].find((b) => b.textContent.trim() === "취소"));
    await openModal("＋ 운행 추가");
    expect(meterInput().value).toBe("");
    // 저장하면 지움
    setValue(meterInput(), "1100");
    await submit();
    expect(salesAdminApi.addDriving).toHaveBeenCalledTimes(1);
    await openModal("＋ 운행 추가");
    expect(meterInput().value).toBe("");
    expect(modal().textContent).not.toContain("불러왔어요");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    // 수정 창은 보관 안 함
    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(meterInput(), "1234");
    fireEvent.click(modal().querySelector(".sl-modal-close"));
    await openModal("＋ 운행 추가");
    expect(meterInput().value).toBe("");
  });

  test("도착 시간이 출발 시간보다 빠르면 저장 안 됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const times = () => modal().querySelectorAll("input[type=time]");
    setValue(times()[0], "11:00");
    setValue(times()[1], "10:00");
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    await submit();
    expect(salesAdminApi.addDriving).not.toHaveBeenCalled();
    expect(modal().textContent).toContain("도착 시간은 출발 시간(11:00)보다 빠를 수 없어요.");
    // 비고 시간도 잠김
    expect(modal().querySelector("input.sl-note-time").disabled).toBe(true);
    // 고치면 저장됨 (같은 시각도 됨)
    setValue(times()[1], "11:00");
    await submit();
    expect(salesAdminApi.addDriving).toHaveBeenCalledTimes(1);
  });

  test("비고 시간 – 출발 · 도착을 먼저 적어야 하고, 그 사이만 저장됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const times = () => modal().querySelectorAll("input[type=time]");
    const noteTime = () => modal().querySelector("input.sl-note-time");
    // 처음엔 출발 · 도착이 비어 있고 비고 시간은 잠김
    expect(times()[0].value).toBe("");
    expect(times()[1].value).toBe("");
    expect(noteTime().disabled).toBe(true);
    setValue(times()[0], "09:00");
    expect(noteTime().disabled).toBe(true);
    setValue(times()[1], "12:00");
    expect(noteTime().disabled).toBe(false);
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    // 범위 밖이면 저장 안 됨
    setValue(noteTime(), "08:50");
    await submit();
    expect(salesAdminApi.addDriving).not.toHaveBeenCalled();
    expect(modal().textContent).toContain("출발(09:00)~도착(12:00) 사이");
    setValue(noteTime(), "12:10");
    await submit();
    expect(salesAdminApi.addDriving).not.toHaveBeenCalled();
    // 경계값은 저장됨
    setValue(noteTime(), "12:00");
    await submit();
    expect(salesAdminApi.addDriving).toHaveBeenCalledTimes(1);
  });

  test("미터기 범위 검사 – 낮으면 저장 안 됨", async () => {
    await open();
    fireEvent.click(screen.getByText("＋ 운행 추가"));
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

// ───────────── 📊 영업 정산관리 – 도착지 오전 / 오후 ─────────────
describe("영업 정산관리 – 도착지 오전 / 오후", () => {
  const destSelect = () => modal().querySelector("select");
  const optionTexts = () => [...destSelect().options].map((o) => o.textContent);
  const customInput = () => modal().querySelector("input.sl-dest-custom");

  test("추가: 오전 / 오후 중 골라서 저장", async () => {
    render(<SalesAdminContent />);
    fireEvent.click(await screen.findByText("김영업"));
    await screen.findByText("명동", undefined, { timeout: 3000 });
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(optionTexts()).toEqual(["선택", "오전", "오후", "기타 (직접 입력)"]);
    expect(destSelect().value).toBe("");
    expect(customInput()).toBeNull();
    setValue(destSelect(), "오후");
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    await submit();
    expect(salesAdminApi.addDriving.mock.calls[0][0].destination).toBe("오후");
  });

  test("추가: 기타 고르면 입력칸이 생기고 적은 도착지로 저장", async () => {
    render(<SalesAdminContent />);
    fireEvent.click(await screen.findByText("김영업"));
    await screen.findByText("명동", undefined, { timeout: 3000 });
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(destSelect(), "기타");
    expect(customInput()).not.toBeNull();
    setValue(customInput(), "인천공항");
    setValue(modal().querySelector("input[placeholder='계량기 숫자']"), "1100");
    await submit();
    expect(salesAdminApi.addDriving.mock.calls[0][0].destination).toBe("인천공항");
    // 다시 오전으로 바꾸면 입력칸 사라짐
    fireEvent.click(screen.getByText("＋ 운행 추가"));
    await waitFor(() => expect(modal()).not.toBeNull());
    setValue(destSelect(), "기타");
    setValue(destSelect(), "오전");
    expect(customInput()).toBeNull();
  });

  test("수정: 예전 도착지(명동)는 기타 + 입력칸에 그대로", async () => {
    render(<SalesAdminContent />);
    fireEvent.click(await screen.findByText("김영업"));
    await screen.findByText("명동", undefined, { timeout: 3000 });
    await clickRowEdit(0);
    await waitFor(() => expect(modal()).not.toBeNull());
    expect(destSelect().value).toBe("기타");
    expect(customInput().value).toBe("명동");
  });
});

// ───────────── 🚗 시작 미터기 (처음 1회) ─────────────
describe("시작 미터기", () => {
  test("기록이 없는 사람 → 시작 미터기 입력창만 뜨고 닫을 수 없음, 저장하면 화면이 열림", async () => {
    salesApi.getStartMeter.mockImplementation(() => ok({ startMeter: null, needed: true }));
    render(<SalesContent />);
    await screen.findByText("🚗 처음 시작하시네요!");
    // 닫기 · 취소 버튼 없음, 뒤 화면(운행일지 표)도 안 보임
    expect(document.querySelector(".sl-modal-close")).toBeNull();
    expect(screen.queryByText("취소")).toBeNull();
    expect(screen.queryByText("명동")).toBeNull();

    // 빈 값은 저장 안 됨
    setValue(modal().querySelector("input"), "0");
    await submit();
    expect(salesApi.saveStartMeter).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ 미터기 숫자를 입력해주세요.")).toBeInTheDocument();

    setValue(modal().querySelector("input"), "10000");
    await submit();
    expect(window.confirm).toHaveBeenCalledWith("시작 미터기를 10,000km 로 저장할까요?");
    expect(salesApi.saveStartMeter).toHaveBeenCalledWith(10000);
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
    expect(screen.queryByText("🚗 처음 시작하시네요!")).toBeNull();
  });

  test("서버가 거절하면 안내 문구가 뜨고 입력창은 그대로", async () => {
    salesApi.getStartMeter.mockImplementation(() => ok({ startMeter: null, needed: true }));
    salesApi.saveStartMeter.mockImplementation(() =>
      Promise.reject({ response: { data: { error: "이미 입력했습니다. 수정은 관리자에게 요청해주세요." } } }),
    );
    render(<SalesContent />);
    await screen.findByText("🚗 처음 시작하시네요!");
    setValue(modal().querySelector("input"), "10000");
    await submit();
    expect(await screen.findByText("⚠ 이미 입력했습니다. 수정은 관리자에게 요청해주세요.")).toBeInTheDocument();
    expect(screen.getByText("🚗 처음 시작하시네요!")).toBeInTheDocument();
  });

  test("이미 기록이 있는 사람 → 입력창 안 뜸", async () => {
    render(<SalesContent />);
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
    expect(screen.queryByText("🚗 처음 시작하시네요!")).toBeNull();
  });

  test("관리자 – 사람 카드에서 시작 미터기 확인 · 수정", async () => {
    salesAdminApi.getSummary.mockImplementation(() =>
      ok([
        { username: "kim", name: "김영업", hasData: true, receiptCount: 1, startMeter: null, startMeterNeeded: true },
        { username: "lee", name: "이영업", hasData: false, receiptCount: 0, startMeter: 5000, startMeterNeeded: false },
      ]),
    );
    render(<SalesAdminContent />);
    expect(await screen.findByText("미입력 ✏️")).toBeInTheDocument();
    expect(screen.getByText("5,000km ✏️")).toBeInTheDocument();

    fireEvent.click(screen.getByText("5,000km ✏️"));
    expect(screen.getByText("시작 미터기 수정 · 이영업")).toBeInTheDocument();
    expect(modal().querySelector("input").value).toBe("5000");
    setValue(modal().querySelector("input"), "4800");
    await submit();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(salesAdminApi.saveStartMeter).toHaveBeenCalledWith("lee", 4800);
    await waitFor(() => expect(modal()).toBeNull());
    // 상세 화면으로 넘어가지 않음 (카드 클릭과 분리)
    expect(screen.queryByText("명동")).toBeNull();

    // 취소하면 저장 없이 닫힘
    fireEvent.click(screen.getByText("미입력 ✏️"));
    fireEvent.click(screen.getByText("취소"));
    expect(modal()).toBeNull();
    expect(salesAdminApi.saveStartMeter).toHaveBeenCalledTimes(1);
  });
});

// ───────────── 💳 카드번호 (처음 1회) ─────────────
describe("카드번호", () => {
  test("카드번호가 없는 사람 → 카드번호 입력창만 뜨고, 저장하면 화면이 열림", async () => {
    salesApi.getMyCard.mockImplementation(() => ok({ cardNumber: "" }));
    salesApi.saveMyCard.mockImplementation(() => ok({}));
    render(<SalesContent />);
    await screen.findByText("💳 법인카드 번호를 등록해주세요");
    expect(document.querySelector(".sl-modal-close")).toBeNull();
    expect(screen.queryByText("취소")).toBeNull();

    // 숫자만 남고 4자리마다 - 자동
    setValue(modal().querySelector("input"), "1234a5678");
    expect(modal().querySelector("input").value).toBe("1234-5678");
    // 자릿수가 모자라면 저장 안 됨
    await submit();
    expect(salesApi.saveMyCard).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ 카드번호 15~16자리를 입력해주세요.")).toBeInTheDocument();

    setValue(modal().querySelector("input"), "11112222333344445555");
    expect(modal().querySelector("input").value).toBe("1111-2222-3333-4444");
    await submit();
    expect(window.confirm).toHaveBeenCalledWith("카드번호를 1111-2222-3333-4444 로 저장할까요?");
    expect(salesApi.saveMyCard).toHaveBeenCalledWith("1111-2222-3333-4444");
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
    expect(screen.queryByText("💳 법인카드 번호를 등록해주세요")).toBeNull();
  });

  test("시작 미터기도 없으면 → 시작 미터기 먼저, 그다음 카드번호", async () => {
    salesApi.getStartMeter.mockImplementation(() => ok({ startMeter: null, needed: true }));
    salesApi.getMyCard.mockImplementation(() => ok({ cardNumber: "" }));
    render(<SalesContent />);
    await screen.findByText("🚗 처음 시작하시네요!");
    setValue(modal().querySelector("input"), "10000");
    await submit();
    expect(await screen.findByText("💳 법인카드 번호를 등록해주세요")).toBeInTheDocument();
  });

  test("관리자 – 사람 카드에서 카드번호 확인 · 수정", async () => {
    salesAdminApi.getSummary.mockImplementation(() =>
      ok([
        { username: "kim", name: "김영업", hasData: true, receiptCount: 1, cardNumber: "" },
        { username: "lee", name: "이영업", hasData: false, receiptCount: 2, receiptTotal: 150000, cardNumber: "1234-5678" },
      ]),
    );
    salesAdminApi.saveCard.mockImplementation(() => ok({}));
    render(<SalesAdminContent />);
    expect(await screen.findByText("미등록 ✏️")).toBeInTheDocument();
    expect(screen.getByText("2건 · 150,000원")).toBeInTheDocument();
    // 평소엔 접혀서 끝 4자리만, 누르면 전체 번호
    expect(screen.queryByText(/1234-5678/)).toBeNull();
    fireEvent.click(screen.getByText("···· 5678 ▾"));
    fireEvent.click(screen.getByText("1234-5678 ✏️"));
    expect(screen.getByText("카드번호 수정 · 이영업")).toBeInTheDocument();
    setValue(modal().querySelector("input"), "9999888877776666");
    await submit();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(salesAdminApi.saveCard).toHaveBeenCalledWith("lee", "9999-8888-7777-6666");
    await waitFor(() => expect(modal()).toBeNull());
  });
});

// ───────────── 📊 월간 통계 – 법인카드 ─────────────
describe("월간 통계 – 법인카드", () => {
  test("법인카드 · 개인사용 · 총금액", async () => {
    salesApi.getReceipts.mockImplementation(() =>
      ok([
        { id: 1, date: "2026-10-22", category: "식대", totalAmount: 11000 },
        { id: 2, date: "2026-10-22", category: "개인사용", totalAmount: 5000, note: "하이패스" },
        { id: 3, date: "2026-10-22", category: "기타", totalAmount: 7000 },
      ]),
    );
    render(<SalesContent />);
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
    fireEvent.click(screen.getByText("📊 월간 통계"));
    const card = async (label) =>
      (await screen.findByText((t) => t.endsWith(label))).parentElement.textContent;
    expect(await card("법인카드 (개인사용 제외)")).toContain("18,000원");
    expect(await card("총금액")).toContain("23,000원");
    const personal = (await screen.findAllByText(/개인사용$/)).map((e) => e.parentElement.textContent);
    expect(personal.some((t) => t.includes("5,000원"))).toBe(true);
  });
});

// ───────────── 📈 영업 정산 통계 탭 ─────────────
describe("영업 정산 통계 탭", () => {
  test("영업 정산관리에는 전체 통계가 없음", async () => {
    render(<SalesAdminContent />);
    await screen.findByText("김영업");
    expect(screen.getByText("📊 정산 목록")).toBeInTheDocument();
    expect(screen.queryByText("📈 전체 통계")).toBeNull();
  });

  test("전체 통계 → 이름 누르면 그 사람 통계 → 돌아오기", async () => {
    render(<SalesAdminStatsTab />);
    const names = await screen.findAllByText("김영업");
    expect(salesAdminApi.getSummary).toHaveBeenCalledWith(2026, 10);
    fireEvent.click(names[names.length - 1]);
    expect(await screen.findByText("김영업님 · 2026년 10월 통계")).toBeInTheDocument();
    expect(salesAdminApi.getDriving).toHaveBeenCalledWith("kim", 2026, 10);
    fireEvent.click(screen.getByText("← 전체 통계"));
    expect(screen.queryByText("김영업님 · 2026년 10월 통계")).toBeNull();
    expect(screen.getAllByText("김영업").length).toBeGreaterThan(0);
  });

  test("불러오지 못하면 안내", async () => {
    salesAdminApi.getSummary.mockImplementation(() => Promise.reject(new Error("403")));
    render(<SalesAdminStatsTab />);
    expect(await screen.findByText(/데이터를 불러오지 못했습니다/)).toBeInTheDocument();
  });
});

// ───────────── 💳 지출내역 기타 · 비고 ─────────────
describe("지출내역 – 기타 · 비고", () => {
  test("개인사용 카테고리는 기타 뒤 맨 아래", async () => {
    salesApi.getCategories.mockImplementation(() =>
      ok([{ id: 1, name: "개인사용" }, { id: 2, name: "식대" }, { id: 3, name: "주차" }]),
    );
    render(<SalesContent />);
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
    fireEvent.click(screen.getByText("💳 법인카드"));
    fireEvent.click(await screen.findByText("＋ 지출내역"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const select = modal().querySelector("select");
    expect([...select.options].map((o) => o.value)).toEqual(["식대", "주차", "기타", "개인사용"]);
    expect(select.value).toBe("식대"); // 개인사용이 먼저 와도 기본 선택은 목록 맨 위

    // 개인사용: 카테고리 바로 밑에 이유 칸 (필수, 비고로 저장)
    const reasonLabel = () => [...modal().querySelectorAll("label")].find((l) => l.textContent.startsWith("개인사용 이유"));
    expect(reasonLabel()).toBeUndefined();
    setValue(select, "개인사용");
    expect(select.parentElement.contains(reasonLabel())).toBe(true);
    const reason = reasonLabel().parentElement.querySelector("input");
    setValue(modal().querySelector("input[type=number]"), "7000");
    expect(modalForm().checkValidity()).toBe(false); // 비어 있으면 저장 안 됨
    setValue(reason, "   ");
    expect(modalForm().checkValidity()).toBe(false); // 띄어쓰기만도 안 됨
    setValue(reason, "개인 식사");
    expect(modalForm().checkValidity()).toBe(true);
    await submit();
    expect(salesApi.addReceipt.mock.calls[0][0]).toMatchObject({ category: "개인사용", note: "개인 식사" });
  });

  test("카테고리 맨 끝에 기타, 비고 · 카드번호가 서버로 감", async () => {
    salesApi.getCategories.mockImplementation(() => ok([{ id: 1, name: "식대" }, { id: 2, name: "주차" }]));
    render(<SalesContent />);
    await screen.findAllByText("명동", undefined, { timeout: 3000 });
    fireEvent.click(screen.getByText("💳 법인카드"));
    fireEvent.click(await screen.findByText("＋ 지출내역"));
    await waitFor(() => expect(modal()).not.toBeNull());
    const select = modal().querySelector("select");
    expect([...select.options].map((o) => o.value)).toEqual(["식대", "주차", "기타"]);
    expect(modal().textContent).toContain("주유는 여기 말고 운행일지의 ⛽ 주유 추가에 적어주세요.");
    const noteLabel = () => [...modal().querySelectorAll("label")].find((l) => l.textContent.startsWith("비고"));
    // 비고 칸은 기타일 때만
    expect(noteLabel()).toBeUndefined();
    setValue(select, "기타");
    expect(noteLabel()).toBeDefined();
    const inputs = modal().querySelectorAll("input[type=text]");
    expect(inputs[0].value).toBe("1234-5678"); // 내 카드번호 미리 채움
    setValue(modal().querySelector("input[type=number]"), "7000");
    setValue(inputs[inputs.length - 1], "세차");
    // 기타 → 식대 → 기타: 숨겨진 비고는 비워짐
    setValue(select, "식대");
    expect(noteLabel()).toBeUndefined();
    setValue(select, "기타");
    expect(modal().querySelectorAll("input[type=text]")[3].value).toBe("");
    setValue(modal().querySelectorAll("input[type=text]")[3], "세차");
    await submit();
    expect(salesApi.addReceipt.mock.calls[0][0]).toMatchObject({
      category: "기타",
      content: "1234-5678",
      amount: "7000",
      note: "세차",
    });
  });
});
