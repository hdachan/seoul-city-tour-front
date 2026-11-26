import client from "./client";
import { makeSalesFormApi } from "./salesFormApi";

// 💼 영업 정산 (영업 사원 본인)
export const salesApi = makeSalesFormApi(client);

// 📊 영업 정산관리 (관리자 · salesUsername 으로 사람 지정)
export const salesAdminApi = {
  getSummary: (y, m) =>
    client.get(`/sales-admin/summary`, {
      params: { year: y, month: m },
    }),
  getLockStatus: (u, y, m) =>
    client.get(`/sales-admin/lock-status`, {
      params: { salesUsername: u, year: y, month: m },
    }),
  toggleLock: (u, y, m, l, weekNum = 0) =>
    client.post(
      `/sales-admin/lock`,
      { salesUsername: u, year: y, month: m, locked: l, weekNum },
    ),
  // 그 달 모든 주 한꺼번에 열기 / 잠그기 (u 없으면 영업 사원 전체)
  bulkLock: (y, m, l, u = null) =>
    client.post(`/sales-admin/lock-bulk`, { year: y, month: m, locked: l, salesUsername: u }),
  getCategories: () => client.get(`/sales-admin/categories`),
  addCategory: (name) => client.post(`/sales-admin/categories`, { name }),
  deleteCategory: (id) => client.delete(`/sales-admin/categories/${id}`),
  getDriving: (u, y, m) =>
    client.get(`/sales-admin/driving`, {
      params: { salesUsername: u, year: y, month: m },
    }),
  getPrevMeter: (u, date) =>
    client.get(`/sales-admin/driving/prev-meter`, {
      params: { salesUsername: u, date },
    }),
  getDrivingDate: (u, date) =>
    client.get(`/sales-admin/driving/date`, {
      params: { salesUsername: u, date },
    }),
  saveStartMeter: (u, startMeter) =>
    client.post(`/sales-admin/start-meter`, { salesUsername: u, startMeter }),
  saveCard: (u, cardNumber) =>
    client.post(`/sales-admin/card`, { salesUsername: u, cardNumber }),
  addDriving: (data) => client.post(`/sales-admin/driving`, data),
  updateDriving: (id, data) => client.put(`/sales-admin/driving/${id}`, data),
  deleteDriving: (id) => client.delete(`/sales-admin/driving/${id}`),
  saveDrivingNotes: (drivingId, contents) =>
    client.post(`/sales-admin/driving/${drivingId}/notes`, contents),
  getDailyNotes: (u, y, m) =>
    client.get(`/sales-admin/daily-notes`, {
      params: { salesUsername: u, year: y, month: m },
    }),
  getPersonalFuelBalance: (u, y, m) =>
    client.get(`/sales-admin/personal-fuel-balance`, {
      params: { salesUsername: u, year: y, month: m },
    }),
  getReceipts: (u, y, m) =>
    client.get(`/sales-admin/receipt`, {
      params: { salesUsername: u, year: y, month: m },
    }),
  addReceipt: (data) => client.post(`/sales-admin/receipt`, data),
  updateReceipt: (id, data) => client.put(`/sales-admin/receipt/${id}`, data),
  deleteReceipt: (id) => client.delete(`/sales-admin/receipt/${id}`),
};

// 🏖 영업 휴무 (영업 사원 본인 · 쉬는 날 + 사유)
export const salesHolidayApi = {
  getMine: (y, m) => client.get(`/sales-holiday`, { params: { year: y, month: m } }),
  save: (date, reason) => client.post(`/sales-holiday`, { date, reason }),
  remove: (date) => client.delete(`/sales-holiday`, { params: { date } }),
};

