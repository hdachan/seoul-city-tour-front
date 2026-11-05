import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import WanbulExtraReps, {
  extraRepsError,
  hasExtraReps,
  wanbulPayload,
} from "./WanbulExtraReps";

const base = {
  paymentType: "완불",
  tourName: "DMZ하프",
  date: "2026-10-15",
  memo: "메모",
  representativeName: "John",
  adult: "2",
  child: "",
  infant: "",
};
const rep2 = { name: " Kim ", adult: "3", child: "1", infant: "" };

test("완불에 추가한 대표자가 있을 때만 여러 건 저장", () => {
  expect(hasExtraReps(base)).toBe(false);
  expect(hasExtraReps({ ...base, extraReps: [rep2] })).toBe(true);
  expect(hasExtraReps({ ...base, paymentType: "현금", extraReps: [rep2] })).toBe(false);
});

test("이름이나 인원이 빠지면 안내 문구", () => {
  expect(extraRepsError({ ...base, extraReps: [rep2] })).toBeNull();
  expect(extraRepsError({ ...base, representativeName: "", extraReps: [rep2] })).toMatch("이름");
  expect(extraRepsError({ ...base, extraReps: [{ ...rep2, name: "  " }] })).toMatch("이름");
  expect(extraRepsError({ ...base, adult: "", extraReps: [rep2] })).toMatch("인원");
  expect(extraRepsError({ ...base, extraReps: [{ ...rep2, adult: "", child: "" }] })).toMatch("인원");
});

test("보내는 값: 첫 번째 칸 + 추가한 사람, 프라이빗은 아이 / 유아 0", () => {
  const form = { ...base, extraReps: [rep2] };
  expect(wanbulPayload(form, false)).toEqual({
    tourName: "DMZ하프",
    date: "2026-10-15",
    memo: "메모",
    note: "",
    reps: [
      { representativeName: "John", adult: "2", child: 0, infant: 0 },
      { representativeName: "Kim", adult: "3", child: "1", infant: 0 },
    ],
  });
  expect(wanbulPayload(form, true).reps[1]).toEqual({
    representativeName: "Kim",
    adult: "3",
    child: 0,
    infant: 0,
  });
});

test("대표자 1 박스는 폼 값 그대로, ＋ 로 늘고 ✕ 로 빠짐 (1은 빼기 없음)", () => {
  const Box = () => {
    const [form, setForm] = useState(base);
    return <WanbulExtraReps form={form} setForm={setForm} isPrivate={false} />;
  };
  render(<Box />);
  expect(screen.getByText("대표자 1")).toBeInTheDocument();
  expect(screen.getByDisplayValue("John")).toBeInTheDocument();
  expect(screen.queryByLabelText("대표자 1 빼기")).toBeNull();
  fireEvent.click(screen.getByText("＋ 대표자 추가"));
  fireEvent.click(screen.getByText("＋ 대표자 추가"));
  expect(screen.getByText("대표자 2")).toBeInTheDocument();
  expect(screen.getByText("대표자 3")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("대표자 3 빼기"));
  expect(screen.queryByText("대표자 3")).toBeNull();
  expect(screen.getByDisplayValue("John")).toBeInTheDocument();
});

test("아이/유아는 박스마다 따로 켜지고, 숨기면 값이 비워짐", () => {
  let latest;
  const Box = () => {
    const [form, setForm] = useState({ ...base, extraReps: [{ ...rep2, child: "" }] });
    latest = form;
    return <WanbulExtraReps form={form} setForm={setForm} isPrivate={false} />;
  };
  render(<Box />);
  expect(screen.queryByText("아이 인원")).toBeNull();

  fireEvent.click(screen.getByLabelText("대표자 2 아이/유아"));
  expect(screen.getAllByText("아이 인원")).toHaveLength(1);
  expect(latest.showKids).toBeFalsy(); // 대표자 1은 그대로
  expect(latest.extraReps[0].showKids).toBe(true);

  fireEvent.change(screen.getByText("아이 인원").parentElement.querySelector("input"), { target: { value: "2" } });
  expect(latest.extraReps[0].child).toBe("2");
  expect(latest.child).toBe("");

  fireEvent.click(screen.getByLabelText("대표자 2 아이/유아"));
  expect(screen.queryByText("아이 인원")).toBeNull();
  expect(latest.extraReps[0].child).toBe("");

  fireEvent.click(screen.getByLabelText("대표자 1 아이/유아"));
  expect(screen.getAllByText("아이 인원")).toHaveLength(1);
  expect(latest.showKids).toBe(true);
  expect(latest.extraReps[0].showKids).toBe(false);
});

test("프라이빗은 아이/유아 버튼 없음", () => {
  render(<WanbulExtraReps form={base} setForm={() => {}} isPrivate />);
  expect(screen.queryByLabelText("대표자 1 아이/유아")).toBeNull();
  expect(screen.getByText("인원")).toBeInTheDocument();
});
