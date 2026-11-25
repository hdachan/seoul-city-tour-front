// 💼 영업 정산 API (영업 사원 본인)
//   http: 보통은 client, 👤 관리자가 그 사람 화면으로 쓸 때는 X-View-As 머리를 붙이는 client (salesViewAs.js)
export const makeSalesFormApi = (http) => ({
  getLockStatus: (y, m) =>
    http.get(`/sales-form/lock-status`, {
      params: { year: y, month: m },
    }),
  getMyCard: () => http.get(`/sales-form/my-card`),
  saveMyCard: (cardNumber) => http.post(`/sales-form/my-card`, { cardNumber }),
  getCategories: () => http.get(`/sales-form/categories`),
  saveDrivingNotes: (drivingId, contents) =>
    http.post(`/sales-form/driving/${drivingId}/notes`, contents),
  getDriving: (y, m) =>
    http.get(`/sales-form/driving`, {
      params: { year: y, month: m },
    }),
  getDrivingDate: (date) =>
    http.get(`/sales-form/driving/date`, {
      params: { date },
    }),
  getPersonalFuelBalance: (y, m) =>
    http.get(`/sales-form/personal-fuel-balance`, {
      params: { year: y, month: m },
    }),
  getPrevMeter: (date) =>
    http.get(`/sales-form/driving/prev-meter`, {
      params: { date },
    }),
  getStartMeter: () => http.get(`/sales-form/start-meter`),
  saveStartMeter: (startMeter) =>
    http.post(`/sales-form/start-meter`, { startMeter }),
  addDriving: (data) => http.post(`/sales-form/driving`, data),
  updateDriving: (id, data) => http.put(`/sales-form/driving/${id}`, data),
  deleteDriving: (id) => http.delete(`/sales-form/driving/${id}`),
  getReceipts: (y, m) =>
    http.get(`/sales-form/receipt`, {
      params: { year: y, month: m },
    }),
  addReceipt: (data) => http.post(`/sales-form/receipt`, data),
  updateReceipt: (id, data) => http.put(`/sales-form/receipt/${id}`, data),
  deleteReceipt: (id) => http.delete(`/sales-form/receipt/${id}`),
  getDailyNote: (date) =>
    http.get(`/sales-form/daily-note`, {
      params: { date },
    }),
  saveDailyNote: (date, note) =>
    http.post(`/sales-form/daily-note`, { date, note }),
});
