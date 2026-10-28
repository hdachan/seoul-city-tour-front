/* eslint-disable testing-library/no-node-access -- 입력칸 · 버튼을 직접 찾음 */
// 👥 계정 관리 (개발자만 관리자 · 개발자 계정) / 🔑 내 비밀번호 변경
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminContent from "./tabs/AdminContent";
import PasswordModal from "./PasswordModal";
import * as authApi from "../api/auth";
import { getRoleFromToken } from "../utils/tokenUtils";

jest.mock("../api/auth", () => ({
  fetchAdminUsers: jest.fn(),
  fetchRoles: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  changeMyPassword: jest.fn(),
}));
jest.mock("../utils/tokenUtils", () => ({ getRoleFromToken: jest.fn() }));

const ok = (data) => Promise.resolve({ data });
const ROLES = [
  { roleKey: "ROLE_ADMIN", displayName: "관리자" },
  { roleKey: "ROLE_DEV", displayName: "개발자" },
  { roleKey: "ROLE_SALES", displayName: "영업" },
  { roleKey: "ROLE_GUIDE", displayName: "가이드" },
];

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  authApi.fetchRoles.mockImplementation(() => ok(ROLES));
  authApi.createUser.mockImplementation(() => ok({}));
});

describe("계정 관리", () => {
  test("관리자 → 관리자·개발자 역할은 고를 수 없음", async () => {
    getRoleFromToken.mockReturnValue("ROLE_ADMIN");
    authApi.fetchAdminUsers.mockImplementation(() =>
      ok([{ id: 3, username: "kim", name: "김영업", role: "ROLE_SALES", me: false }]),
    );
    render(<AdminContent />);
    await screen.findByText("김영업");
    expect(screen.queryByText("🔒 개발자만 보임")).toBeNull();
    fireEvent.click(screen.getByText("+ 계정 추가"));
    const options = [...document.querySelector(".modal select").options].map((o) => o.textContent);
    expect(options).toEqual(["영업", "가이드"]);
  });

  test("개발자 → 관리자 칸이 맨 위, 사장님 관리자 계정 만들기", async () => {
    getRoleFromToken.mockReturnValue("ROLE_DEV");
    authApi.fetchAdminUsers.mockImplementation(() =>
      ok([
        { id: 3, username: "kim", name: "김영업", role: "ROLE_SALES", me: false },
        { id: 1, username: "admin", name: "관리자", role: "ROLE_ADMIN", me: false },
        { id: 2, username: "devv", name: "개발자", role: "ROLE_DEV", me: true },
      ]),
    );
    render(<AdminContent />);
    await screen.findByText("김영업");
    expect(screen.getAllByText("🔒 개발자만 보임")).toHaveLength(2);
    // 내 계정: "나" 표시 · 삭제 버튼 없음 (삭제 버튼은 나머지 2명만)
    expect(screen.getByText("나")).toBeInTheDocument();
    expect(screen.getAllByText("삭제")).toHaveLength(2);

    fireEvent.click(screen.getByText("+ 계정 추가"));
    const select = document.querySelector(".modal select");
    expect([...select.options].map((o) => o.textContent)).toEqual(["관리자", "개발자", "영업", "가이드"]);
    fireEvent.change(select, { target: { value: "ROLE_ADMIN" } });
    expect(screen.getByText(/믿을 수 있는 사람에게만/)).toBeInTheDocument();
    const inputs = document.querySelectorAll(".modal input");
    fireEvent.change(inputs[0], { target: { value: "사장님" } });
    fireEvent.change(inputs[1], { target: { value: "boss" } });
    fireEvent.change(inputs[2], { target: { value: "boss1234" } });
    fireEvent.click(screen.getByText("계정 생성"));
    await waitFor(() =>
      expect(authApi.createUser).toHaveBeenCalledWith("boss", "boss1234", "ROLE_ADMIN", "사장님"),
    );
  });
});

describe("내 비밀번호 변경", () => {
  test("새 비밀번호 확인이 다르면 안 보냄, 맞으면 변경", async () => {
    authApi.changeMyPassword.mockImplementation(() => ok({}));
    const onDone = jest.fn();
    render(<PasswordModal onClose={() => {}} onDone={onDone} />);
    const [cur, next, confirm] = document.querySelectorAll(".modal input");
    fireEvent.change(cur, { target: { value: "1234" } });
    fireEvent.change(next, { target: { value: "abcd5678" } });
    fireEvent.change(confirm, { target: { value: "abcd567" } });
    fireEvent.click(screen.getByText("변경"));
    expect(screen.getByText("⚠ 새 비밀번호가 서로 다릅니다.")).toBeInTheDocument();
    expect(authApi.changeMyPassword).not.toHaveBeenCalled();

    fireEvent.change(confirm, { target: { value: "abcd5678" } });
    fireEvent.click(screen.getByText("변경"));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(authApi.changeMyPassword).toHaveBeenCalledWith("1234", "abcd5678");
  });

  test("현재 비밀번호가 틀리면 서버 안내 표시", async () => {
    authApi.changeMyPassword.mockImplementation(() =>
      Promise.reject({ response: { data: { error: "현재 비밀번호가 맞지 않습니다." } } }),
    );
    render(<PasswordModal onClose={() => {}} onDone={() => {}} />);
    const [cur, next, confirm] = document.querySelectorAll(".modal input");
    fireEvent.change(cur, { target: { value: "wrong" } });
    fireEvent.change(next, { target: { value: "abcd5678" } });
    fireEvent.change(confirm, { target: { value: "abcd5678" } });
    fireEvent.click(screen.getByText("변경"));
    expect(await screen.findByText("⚠ 현재 비밀번호가 맞지 않습니다.")).toBeInTheDocument();
  });
});
