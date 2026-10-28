/* eslint-disable testing-library/no-node-access -- 버튼 · 배지 상태를 직접 확인 */
// ✉️ 요청사항: 관리자 보내기 · 목록 / 받는 사람 팝업 · 확인 · 수정 완료
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequestsContent from "./RequestsContent";
import RequestNotice from "./RequestNotice";
import { requestsApi } from "../../../api/requests";

jest.mock("../../../api/requests", () => ({
  requestsApi: Object.fromEntries(
    ["getTargets", "getAll", "send", "remove", "getMine", "markRead", "markDone"].map((n) => [n, jest.fn()]),
  ),
}));

const ok = (data) => Promise.resolve({ data });
const req = (over) => ({
  id: 1, fromName: "관리자", toName: "김영업", toUsername: "kim", content: "10/27 미터기 확인해주세요",
  status: "SENT", createdAt: "2026-10-28T09:05:00", readAt: "", doneAt: "", ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  requestsApi.getTargets.mockImplementation(() =>
    ok([
      { username: "kim", name: "김영업", role: "ROLE_SALES" },
      { username: "lee", name: "이영업", role: "ROLE_SALES" },
      { username: "park", name: "박가이드", role: "ROLE_GUIDE" },
    ]),
  );
  requestsApi.getAll.mockImplementation(() =>
    ok([
      req({ id: 3, status: "DONE", readAt: "2026-10-28T10:00:00", doneAt: "2026-10-28T11:00:00" }),
      req({ id: 2, status: "READ", toName: "이영업", readAt: "2026-10-28T10:00:00" }),
      req({ id: 1 }),
    ]),
  );
  requestsApi.send.mockImplementation(() => ok({ message: "2명에게 보냈습니다." }));
  requestsApi.remove.mockImplementation(() => ok({}));
  requestsApi.markRead.mockImplementation(() => ok({}));
  requestsApi.markDone.mockImplementation(() => ok({}));
});

describe("관리자 – 요청사항 탭", () => {
  test("받는 사람을 고르고 내용을 적어 보내기", async () => {
    render(<RequestsContent />);
    fireEvent.click(await screen.findByText("김영업", { selector: "button" }));
    fireEvent.click(screen.getByText("박가이드"));
    expect(screen.getByText("(2명 선택)")).toBeInTheDocument();

    // 내용 없으면 안 보냄
    fireEvent.click(screen.getByText("보내기"));
    expect(requestsApi.send).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ 내용을 입력해주세요.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/미터기가 오전보다/), { target: { value: "  오후 미터기 확인  " } });
    fireEvent.click(screen.getByText("보내기"));
    await waitFor(() => expect(requestsApi.send).toHaveBeenCalledWith(["kim", "park"], "오후 미터기 확인"));
    expect(await screen.findByText("✓ 2명에게 보냈습니다.")).toBeInTheDocument();
  });

  test("상태별로 보이고, 필터 · 삭제", async () => {
    render(<RequestsContent />);
    expect(await screen.findByText("안 읽음", { selector: ".rq-badge" })).toBeInTheDocument();
    expect(screen.getByText("확인", { selector: ".rq-badge" })).toBeInTheDocument();
    expect(screen.getByText("완료 10/28 11:00")).toBeInTheDocument();

    fireEvent.click(screen.getByText("완료", { selector: ".rq-filter" }));
    expect(document.querySelectorAll(".rq-item")).toHaveLength(1);

    fireEvent.click(screen.getByText("삭제"));
    await waitFor(() => expect(requestsApi.remove).toHaveBeenCalledWith(3));
  });
});

describe("받는 사람 – 팝업", () => {
  test("안 읽은 요청 → 팝업, 확인 누르면 닫히고 머리글 버튼에 남음", async () => {
    let mine = [req({ id: 1 }), req({ id: 2, content: "영수증 다시 올려주세요" })];
    requestsApi.getMine.mockImplementation(() => ok(mine));
    requestsApi.markRead.mockImplementation(() => {
      mine = mine.map((r) => ({ ...r, status: "READ" }));
      return ok({});
    });
    render(<RequestNotice />);
    expect(await screen.findByText("✉️ 요청사항이 왔어요 (2)")).toBeInTheDocument();
    expect(screen.getByText("영수증 다시 올려주세요")).toBeInTheDocument();
    // 닫기 버튼 없음
    expect(document.querySelector(".rq-modal-close")).toBeNull();

    fireEvent.click(screen.getByText("확인"));
    await waitFor(() => expect(screen.queryByText(/요청사항이 왔어요/)).toBeNull());
    expect(requestsApi.markRead).toHaveBeenCalledTimes(2);
    expect(screen.getByText("2", { selector: ".rq-header-count" })).toBeInTheDocument();
  });

  test("머리글 버튼 → 수정 완료", async () => {
    let mine = [req({ id: 5, status: "READ" })];
    requestsApi.getMine.mockImplementation(() => ok(mine));
    requestsApi.markDone.mockImplementation(() => {
      mine = [];
      return ok({});
    });
    render(<RequestNotice />);
    fireEvent.click(await screen.findByText(/요청/, { selector: ".rq-header-btn" }));
    expect(screen.getByText("✉️ 받은 요청 (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("✓ 수정 완료"));
    await waitFor(() => expect(requestsApi.markDone).toHaveBeenCalledWith(5));
    await waitFor(() => expect(document.querySelector(".rq-header-btn")).toBeNull());
  });

  test("요청이 없으면 아무것도 안 보임", async () => {
    requestsApi.getMine.mockImplementation(() => ok([]));
    const { container } = render(<RequestNotice />);
    await waitFor(() => expect(requestsApi.getMine).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });
});
