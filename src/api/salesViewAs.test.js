// 👤 그 사람 화면으로 쓰기: 영업 본인과 같은 주소 + X-View-As 머리
import client from "./client";
import { salesAdminApi } from "./sales";
import { salesViewAsApis } from "./salesViewAs";

jest.mock("./client", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock("./sales", () => ({ salesAdminApi: { getSummary: jest.fn() } }));

const H = { headers: { "X-View-As": "kim" } };

test("조회 · 추가 · 수정 · 삭제 모두 /sales-form 주소에 X-View-As 머리를 붙여 부름", () => {
  const { api } = salesViewAsApis({ username: "kim" });
  api.getDriving(2026, 10);
  expect(client.get).toHaveBeenCalledWith("/sales-form/driving", { params: { year: 2026, month: 10 }, ...H });
  api.getMyCard();
  expect(client.get).toHaveBeenLastCalledWith("/sales-form/my-card", H);
  api.addDriving({ date: "2026-10-22" });
  expect(client.post).toHaveBeenCalledWith("/sales-form/driving", { date: "2026-10-22" }, H);
  api.updateReceipt(5, { amount: 1 });
  expect(client.put).toHaveBeenCalledWith("/sales-form/receipt/5", { amount: 1 }, H);
  api.deleteDriving(3);
  expect(client.delete).toHaveBeenCalledWith("/sales-form/driving/3", H);
  api.saveDailyNote("2026-10-22", "메모");
  expect(client.post).toHaveBeenLastCalledWith("/sales-form/daily-note", { date: "2026-10-22", note: "메모" }, H);
});

test("휴무는 관리자 요약에서 그 사람 것만", async () => {
  salesAdminApi.getSummary.mockResolvedValue({
    data: [
      { username: "lee", holidays: [{ date: "2026-10-01", reason: "x" }] },
      { username: "kim", holidays: [{ date: "2026-10-05", reason: "병원" }] },
    ],
  });
  const { holidayApi } = salesViewAsApis({ username: "kim" });
  expect((await holidayApi.getMine(2026, 10)).data).toEqual([{ date: "2026-10-05", reason: "병원" }]);
});
