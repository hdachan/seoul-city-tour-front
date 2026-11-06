import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import IncomeOptions, { IncomeTotalBox, OptionList, clearOptions, defaultPay, incomeTotalLines, optionsError, optionsSum } from "./IncomeOptions";

const Box = ({ paymentType, onValue }) => {
  const [options, setOptions] = useState([]);
  onValue && onValue(options);
  return (
    <IncomeOptions
      options={options}
      onChange={setOptions}
      tourName="DMZ"
      tourOptions={["케이블카", "점심"]}
      paymentType={paymentType}
    />
  );
};

test("총 합계 칸: 어른 + 아이 + 옵션을 줄마다, 맨 아래 총 합계", () => {
  const form = {
    paymentType: "현금",
    amount: "10000",
    adult: "2",
    childAmount: "5000",
    child: "1",
    options: [{ optionName: "입장권", amount: "2000" }],
  };
  expect(incomeTotalLines(form, false)).toEqual([
    ["어른 10,000원 × 2명", 20000],
    ["아이 5,000원 × 1명", 5000],
    ["옵션 입장권", 2000],
  ]);
  render(<IncomeTotalBox form={form} isPrivate={false} />);
  expect(screen.getByText("총 합계")).toBeInTheDocument();
  expect(screen.getByText("27,000원")).toBeInTheDocument();
});

test("총 합계 칸: 프라이빗 · 교차 · 완불, 아무것도 없으면 안 나옴", () => {
  const options = [{ optionName: "점심", amount: 1000 }];
  expect(incomeTotalLines({ paymentType: "현금", amount: "50000", adult: "3", options }, true)).toEqual([
    ["프라이빗 3명 (총액 그대로)", 50000],
    ["옵션 점심", 1000],
  ]);
  expect(incomeTotalLines({ paymentType: "그외-교차", cashAmount: "1000", cardAmount: "2000", options }, false)).toEqual([
    ["현금", 1000],
    ["카드", 2000],
    ["옵션 점심", 1000],
  ]);
  expect(incomeTotalLines({ paymentType: "완불", amount: "9", adult: "2", options }, false)).toEqual([["옵션 점심", 1000]]);
  const { container } = render(<IncomeTotalBox form={{ paymentType: "현금" }} isPrivate={false} />);
  expect(container).toBeEmptyDOMElement();
});

test("옵션 합계", () => {
  expect(optionsSum([{ amount: "10000" }, { amount: 20000 }])).toBe(30000);
  expect(optionsSum()).toBe(0);
});

test("빠진 칸 안내: 옵션 · 금액 · 결제 (완불 · 그외는 직접 골라야)", () => {
  const ok = { optionName: "점심", amount: "1000", paymentType: "현금" };
  expect(optionsError([ok], "완불")).toBeNull();
  expect(optionsError([{ ...ok, paymentType: "" }], "현금")).toBeNull();
  expect(optionsError([{ ...ok, optionName: "" }], "현금")).toMatch("옵션을");
  expect(optionsError([{ ...ok, amount: "" }], "현금")).toMatch("금액");
  expect(optionsError([{ ...ok, paymentType: "" }], "완불")).toMatch("교차를");
  expect(optionsError([{ ...ok, paymentType: "" }], "그외")).toMatch("교차를");
  expect(optionsError([{ ...ok, paymentType: "교차", amount: "" }], "현금")).toMatch("교차 옵션");
  expect(optionsError(undefined, "현금")).toBeNull();
});

test("옵션 결제 처음 값은 수입 결제유형을 따름", () => {
  expect(defaultPay("현금")).toBe("현금");
  expect(defaultPay("그외-현금")).toBe("현금");
  expect(defaultPay("카드")).toBe("카드");
  expect(defaultPay("그외-카드")).toBe("카드");
  expect(defaultPay("그외-교차")).toBe("교차");
  expect(defaultPay("완불")).toBe("");
  expect(defaultPay("그외")).toBe("");
});

test("모든 결제유형에서 현금 / 카드 / 교차 버튼, 여러 개 추가 / 빼기", () => {
  let value;
  const { unmount } = render(<Box paymentType="완불" onValue={(v) => (value = v)} />);
  fireEvent.click(screen.getByText("＋ 옵션 추가"));
  fireEvent.click(screen.getByText("＋ 옵션 추가"));
  expect(screen.getAllByText("교차")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("옵션 1"), { target: { value: "점심" } });
  fireEvent.change(screen.getByLabelText("옵션금액 1"), { target: { value: "5000" } });
  fireEvent.click(screen.getByLabelText("옵션 1 카드"));
  expect(value[0]).toEqual({ optionName: "점심", custom: false, amount: "5000", paymentType: "카드", payTouched: true });
  expect(screen.getByText("옵션 합계")).toBeInTheDocument();
  expect(screen.getByText("5,000원")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("옵션 2 빼기"));
  expect(value).toHaveLength(1);
  unmount();

  render(<Box paymentType="현금" onValue={(v) => (value = v)} />);
  fireEvent.click(screen.getByText("＋ 옵션 추가"));
  expect(screen.getByLabelText("옵션 1 현금")).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("옵션 1 교차")).toBeInTheDocument();
});

test("교차: 현금 / 카드 금액 칸 두 개, 합이 옵션금액", () => {
  let value;
  render(<Box paymentType="현금" onValue={(v) => (value = v)} />);
  fireEvent.click(screen.getByText("＋ 옵션 추가"));
  fireEvent.change(screen.getByLabelText("옵션 1"), { target: { value: "점심" } });
  fireEvent.change(screen.getByLabelText("옵션금액 1"), { target: { value: "10000" } });
  fireEvent.click(screen.getByLabelText("옵션 1 교차"));
  expect(screen.queryByLabelText("옵션금액 1")).toBeNull();
  expect(screen.getByLabelText("옵션 현금 1")).toHaveValue(10000); // 적어둔 금액은 현금 칸으로
  fireEvent.change(screen.getByLabelText("옵션 현금 1"), { target: { value: "4000" } });
  fireEvent.change(screen.getByLabelText("옵션 카드 1"), { target: { value: "6000" } });
  expect(value[0]).toMatchObject({ paymentType: "교차", cashAmount: "4000", cardAmount: "6000", amount: 10000 });
  expect(optionsError(value, "현금")).toBeNull();
  expect(screen.getByText("10,000원")).toBeInTheDocument();
  expect(incomeTotalLines({ paymentType: "현금", options: value }, false)).toEqual([["옵션 점심 (현금 4,000원 / 카드 6,000원)", 10000]]);
});

test("수입 결제유형을 바꾸면 직접 안 누른 옵션만 따라 바뀜", () => {
  let value;
  const Switch = () => {
    const [pay, setPay] = useState("현금");
    const [options, setOptions] = useState([]);
    value = options;
    return (
      <>
        <button onClick={() => setPay("카드")}>카드로</button>
        <IncomeOptions options={options} onChange={setOptions} tourName="DMZ" tourOptions={["점심"]} paymentType={pay} />
      </>
    );
  };
  render(<Switch />);
  fireEvent.click(screen.getByText("＋ 옵션 추가"));
  fireEvent.click(screen.getByText("＋ 옵션 추가"));
  fireEvent.click(screen.getByLabelText("옵션 2 교차"));
  fireEvent.click(screen.getByText("카드로"));
  expect(value[0].paymentType).toBe("카드");
  expect(value[1].paymentType).toBe("교차");
});

test("투어를 안 고르면 칸이 안 나오고, 옵션 없는 투어도 기타는 고를 수 있음", () => {
  const { container, unmount } = render(<IncomeOptions options={[]} onChange={() => {}} tourOptions={[]} paymentType="현금" />);
  expect(container).toBeEmptyDOMElement();
  unmount();

  let value;
  const Empty = () => {
    const [options, setOptions] = useState([]);
    value = options;
    return <IncomeOptions options={options} onChange={setOptions} tourName="DMZ" tourOptions={[]} paymentType="현금" />;
  };
  render(<Empty />);
  fireEvent.click(screen.getByText("＋ 옵션 추가"));
  expect(screen.queryByLabelText("기타 내용 1")).toBeNull();
  fireEvent.change(screen.getByLabelText("옵션 1"), { target: { value: "기타" } });
  expect(optionsError(value, "현금")).toMatch("기타 내용");
  fireEvent.change(screen.getByLabelText("기타 내용 1"), { target: { value: "입장권" } });
  fireEvent.change(screen.getByLabelText("옵션금액 1"), { target: { value: "3000" } });
  expect(value[0].optionName).toBe("입장권");
  expect(optionsError(value, "현금")).toBeNull();
});

test("기타로 고른 뒤 목록 옵션으로 바꾸면 내용 칸이 사라짐, 이름 지우면 기타 유지", () => {
  let value;
  const One = () => {
    const [options, setOptions] = useState([{ optionName: "", custom: true, amount: "" }]);
    value = options;
    return <IncomeOptions options={options} onChange={setOptions} tourName="DMZ" tourOptions={["점심"]} paymentType="현금" />;
  };
  render(<One />);
  fireEvent.change(screen.getByLabelText("기타 내용 1"), { target: { value: "점" } });
  fireEvent.change(screen.getByLabelText("기타 내용 1"), { target: { value: "점심" } });
  expect(screen.getByLabelText("옵션 1")).toHaveValue("기타"); // 목록과 같은 글자를 적어도 기타 그대로
  fireEvent.change(screen.getByLabelText("기타 내용 1"), { target: { value: "" } });
  expect(screen.getByLabelText("옵션 1")).toHaveValue("기타");
  fireEvent.change(screen.getByLabelText("옵션 1"), { target: { value: "점심" } });
  expect(screen.queryByLabelText("기타 내용 1")).toBeNull();
  expect(value[0]).toMatchObject({ optionName: "점심", custom: false });
});

test("수정 창: 목록에 없는 이름(기타로 적은 것 · 지운 옵션)은 기타 + 내용으로 보임", () => {
  render(
    <IncomeOptions
      options={[{ optionName: "예전옵션", amount: 1000, paymentType: "현금" }]}
      onChange={() => {}}
      tourName="DMZ"
      tourOptions={["점심"]}
      paymentType="현금"
    />,
  );
  expect(screen.getByLabelText("옵션 1")).toHaveValue("기타");
  expect(screen.getByLabelText("기타 내용 1")).toHaveValue("예전옵션");
});

test("투어를 바꾸면 대표자 박스 옵션까지 비움", () => {
  const form = { tourName: "A", options: [{}], extraReps: [{ name: "Kim", options: [{}] }] };
  expect(clearOptions(form)).toEqual({ tourName: "A", options: [], extraReps: [{ name: "Kim", options: [] }] });
});

test("표에 옵션 이름 · 금액 · 결제 표시 (교차는 나눈 금액)", () => {
  render(
    <OptionList
      options={[
        { optionName: "점심", amount: 10000, paymentType: "현금" },
        { optionName: "케이블카", amount: 10000, paymentType: "교차", cashAmount: 4000, cardAmount: 6000 },
      ]}
    />,
  );
  expect(screen.getByText("점심 10,000원 (현금)")).toBeInTheDocument();
  expect(screen.getByText("케이블카 10,000원 (교차: 현금 4,000원 / 카드 6,000원)")).toBeInTheDocument();
});
