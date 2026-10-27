import client from "./client";

// 💼 영업 정산 (영업 사원 본인)
export const salesApi = {
  getLockStatus: (y, m) =>
    client.get(`/sales-form/lock-status`, {
      params: { year: y, month: m },
    }),
  getMyCard: () => client.get(`/sales-form/my-card`),
  saveMyCard: (cardNumber) => client.post(`/sales-form/my-card`, { cardNumber }),
  getCategories: () => client.get(`/sales-form/categories`),
  saveDrivingNotes: (drivingId, contents) =>
    client.post(`/sales-form/driving/${drivingId}/notes`, contents),
  getDriving: (y, m) =>
    client.get(`/sales-form/driving`, {
      params: { year: y, month: m },
    }),
  getDrivingDate: (date) =>
    client.get(`/sales-form/driving/date`, {
      params: { date },
    }),
  getPersonalFuelBalance: (y, m) =>
    client.get(`/sales-form/personal-fuel-balance`, {
      params: { year: y, month: m },
    }),
  getPrevMeter: (date) =>
    client.get(`/sales-form/driving/prev-meter`, {
      params: { date },
    }),
  getStartMeter: () => client.get(`/sales-form/start-meter`),
  saveStartMeter: (startMeter) =>
    client.post(`/sales-form/start-meter`, { startMeter }),
  addDriving: (data) => client.post(`/sales-form/driving`, data),
  updateDriving: (id, data) => client.put(`/sales-form/driving/${id}`, data),
  deleteDriving: (id) => client.delete(`/sales-form/driving/${id}`),
  getReceipts: (y, m) =>
    client.get(`/sales-form/receipt`, {
      params: { year: y, month: m },
    }),
  addReceipt: (data) => client.post(`/sales-form/receipt`, data),
  updateReceipt: (id, data) => client.put(`/sales-form/receipt/${id}`, data),
  deleteReceipt: (id) => client.delete(`/sales-form/receipt/${id}`),
  getDailyNote: (date) =>
    client.get(`/sales-form/daily-note`, {
      params: { date },
    }),
  saveDailyNote: (date, note) =>
    client.post(`/sales-form/daily-note`, { date, note }),
};

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
