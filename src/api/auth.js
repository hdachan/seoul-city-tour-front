import axios from "axios";

const BASE_URL = "http://localhost:8080/api";

// 토큰을 헤더에 담는 함수
const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  },
});

// ── 로그인 (POST 방식으로 변경, 토큰 발급) ──
export const login = async (username, password) => {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    username,
    password,
  });
  return response.data; // { token, username, role, name }
};

// 계정 관리
export const fetchAdminUsers = () =>
  axios.get(`${BASE_URL}/admin/users`, authHeader());
export const createUser = (username, password, role, name) =>
  axios.post(
    `${BASE_URL}/admin/users/create`,
    { username, password, role, name },
    authHeader(),
  );
export const deleteUser = (id) =>
  axios.delete(`${BASE_URL}/admin/users/${id}`, authHeader());

// 운행 기록
export const fetchRecords = () =>
  axios.get(`${BASE_URL}/record/list`, authHeader());
export const addRecord = (data) =>
  axios.post(`${BASE_URL}/record/add`, data, authHeader());
export const removeRecord = (id) =>
  axios.delete(`${BASE_URL}/record/${id}`, authHeader());
export const fetchCategories = (type) =>
  axios.get(`${BASE_URL}/record/categories/${type}`, authHeader());
export const addCategory = (type, name, price) =>
  axios.post(
    `${BASE_URL}/record/categories`,
    { type, name, price },
    authHeader(),
  );
export const removeCategory = (id) =>
  axios.delete(`${BASE_URL}/record/categories/${id}`, authHeader());

// 업체별 정산
export const fetchPlatforms = () =>
  axios.get(`${BASE_URL}/settlement/platforms`, authHeader());
export const addPlatform = (name) =>
  axios.post(`${BASE_URL}/settlement/platforms`, { name }, authHeader());
export const removePlatform = (id) =>
  axios.delete(`${BASE_URL}/settlement/platforms/${id}`, authHeader());
export const fetchMonthlySettlement = (year, month) =>
  axios.get(`${BASE_URL}/settlement/monthly`, {
    ...authHeader(),
    params: { year, month },
  });
export const saveSettlement = (platformId, year, month, amount, region, memo) =>
  axios.post(
    `${BASE_URL}/settlement/save`,
    { platformId, year, month, amount, region, memo },
    authHeader(),
  );
export const deleteSettlement = (id) =>
  axios.delete(`${BASE_URL}/settlement/${id}`, authHeader());
export const fetchYearlySettlement = (year) =>
  axios.get(`${BASE_URL}/settlement/yearly`, {
    ...authHeader(),
    params: { year },
  });

// 인삼 매출
export const fetchGinsengPrice = () =>
  axios.get(`${BASE_URL}/ginseng/price`, authHeader());
export const saveGinsengPrice = (pricePerUnit) =>
  axios.post(`${BASE_URL}/ginseng/price`, { pricePerUnit }, authHeader());
export const fetchGuides = () =>
  axios.get(`${BASE_URL}/ginseng/guides`, authHeader());
export const fetchAllGuides = () =>
  axios.get(`${BASE_URL}/ginseng/guides/all`, authHeader());
export const addGinsengGuide = (name) =>
  axios.post(`${BASE_URL}/ginseng/guides`, { name }, authHeader());
export const toggleGinsengGuide = (id) =>
  axios.post(`${BASE_URL}/ginseng/guides/${id}/toggle`, {}, authHeader());
export const fetchGinsengMonthly = (year, month) =>
  axios.get(`${BASE_URL}/ginseng/monthly`, {
    ...authHeader(),
    params: { year, month },
  });
export const saveGinsengRecord = (guideName, date, count) =>
  axios.post(
    `${BASE_URL}/ginseng/save`,
    { guideName, date, count },
    authHeader(),
  );
export const deleteGinsengRecord = (id) =>
  axios.delete(`${BASE_URL}/ginseng/${id}`, authHeader());

// 가이드 정산폼
export const fetchTourNames = () =>
  axios.get(`${BASE_URL}/guide-form/tour-names`, authHeader());
export const addTourName = (name) =>
  axios.post(`${BASE_URL}/guide-form/tour-names`, { name }, authHeader());
export const deleteTourName = (id) =>
  axios.delete(`${BASE_URL}/guide-form/tour-names/${id}`, authHeader());
export const fetchGuideLockStatus = () =>
  axios.get(`${BASE_URL}/guide-form/lock-status`, authHeader());
export const fetchGuideRecords = () =>
  axios.get(`${BASE_URL}/guide-form/records`, authHeader());
export const addGuideRecord = (data) =>
  axios.post(`${BASE_URL}/guide-form/records`, data, authHeader());
export const updateGuideRecord = (id, data) =>
  axios.put(`${BASE_URL}/guide-form/records/${id}`, data, authHeader());
export const deleteGuideRecord = (id) =>
  axios.delete(`${BASE_URL}/guide-form/records/${id}`, authHeader());
export const fetchGuideExpense = () =>
  axios.get(`${BASE_URL}/guide-form/expense`, authHeader());
export const addGuideExpense = (data) =>
  axios.post(`${BASE_URL}/guide-form/expense`, data, authHeader());
export const updateGuideExpense = (id, data) =>
  axios.put(`${BASE_URL}/guide-form/expense/${id}`, data, authHeader());
export const deleteGuideExpense = (id) =>
  axios.delete(`${BASE_URL}/guide-form/expense/${id}`, authHeader());
export const fetchGuideDailyFee = () =>
  axios.get(`${BASE_URL}/guide-form/daily-fee`, authHeader());
export const addGuideDailyFee = (amount, date) =>
  axios.post(
    `${BASE_URL}/guide-form/daily-fee`,
    { amount, date },
    authHeader(),
  );
export const updateGuideDailyFee = (id, amount, date) =>
  axios.put(
    `${BASE_URL}/guide-form/daily-fee/${id}`,
    { amount, date },
    authHeader(),
  );
export const deleteGuideDailyFee = (id) =>
  axios.delete(`${BASE_URL}/guide-form/daily-fee/${id}`, authHeader());

// 관리자용 가이드 정산
export const fetchAdminGuideList = () =>
  axios.get(`${BASE_URL}/guide-admin/guides`, authHeader());
export const fetchAdminSummary = (year, month) =>
  axios.get(`${BASE_URL}/guide-admin/summary`, {
    ...authHeader(),
    params: { year, month },
  });
export const fetchAdminLockStatus = (guideUsername, year, month) =>
  axios.get(`${BASE_URL}/guide-admin/lock-status`, {
    ...authHeader(),
    params: { guideUsername, year, month },
  });
export const toggleMonthLock = (guideUsername, year, month, locked) =>
  axios.post(
    `${BASE_URL}/guide-admin/lock`,
    { guideUsername, year, month, locked },
    authHeader(),
  );
export const fetchAdminGuideIncome = (guideUsername, year, month) =>
  axios.get(`${BASE_URL}/guide-admin/income`, {
    ...authHeader(),
    params: { guideUsername, year, month },
  });
export const addAdminIncome = (data) =>
  axios.post(`${BASE_URL}/guide-admin/income`, data, authHeader());
export const updateAdminIncome = (id, data) =>
  axios.put(`${BASE_URL}/guide-admin/income/${id}`, data, authHeader());
export const deleteAdminIncome = (id) =>
  axios.delete(`${BASE_URL}/guide-admin/income/${id}`, authHeader());
export const fetchAdminGuideExpense = (guideUsername, year, month) =>
  axios.get(`${BASE_URL}/guide-admin/expense`, {
    ...authHeader(),
    params: { guideUsername, year, month },
  });
export const addAdminExpense = (data) =>
  axios.post(`${BASE_URL}/guide-admin/expense`, data, authHeader());
export const updateAdminExpense = (id, data) =>
  axios.put(`${BASE_URL}/guide-admin/expense/${id}`, data, authHeader());
export const deleteAdminExpense = (id) =>
  axios.delete(`${BASE_URL}/guide-admin/expense/${id}`, authHeader());
export const fetchAdminGuideDailyFee = (guideUsername, year, month) =>
  axios.get(`${BASE_URL}/guide-admin/daily-fee`, {
    ...authHeader(),
    params: { guideUsername, year, month },
  });
export const addAdminDailyFee = (data) =>
  axios.post(`${BASE_URL}/guide-admin/daily-fee`, data, authHeader());
export const updateAdminDailyFee = (id, amount, date) =>
  axios.put(
    `${BASE_URL}/guide-admin/daily-fee/${id}`,
    { amount, date },
    authHeader(),
  );
export const deleteAdminDailyFee = (id) =>
  axios.delete(`${BASE_URL}/guide-admin/daily-fee/${id}`, authHeader());

// ── 기존 auth.js 맨 아래에 추가 ──

// 영업 정산폼 (영업용)
export const fetchSalesLockStatus = () =>
  axios.get(`${BASE_URL}/sales-form/lock-status`, authHeader());

export const fetchSalesReceipts = () =>
  axios.get(`${BASE_URL}/sales-form/receipt`, authHeader());
export const addSalesReceipt = (data) =>
  axios.post(`${BASE_URL}/sales-form/receipt`, data, authHeader());
export const updateSalesReceipt = (id, data) =>
  axios.put(`${BASE_URL}/sales-form/receipt/${id}`, data, authHeader());
export const deleteSalesReceipt = (id) =>
  axios.delete(`${BASE_URL}/sales-form/receipt/${id}`, authHeader());

export const fetchSalesDriving = () =>
  axios.get(`${BASE_URL}/sales-form/driving`, authHeader());
export const addSalesDriving = (data) =>
  axios.post(`${BASE_URL}/sales-form/driving`, data, authHeader());
export const updateSalesDriving = (id, data) =>
  axios.put(`${BASE_URL}/sales-form/driving/${id}`, data, authHeader());
export const deleteSalesDriving = (id) =>
  axios.delete(`${BASE_URL}/sales-form/driving/${id}`, authHeader());

// 영업 관리자용
export const fetchSalesUserList = () =>
  axios.get(`${BASE_URL}/sales-admin/sales-users`, authHeader());
export const fetchSalesAdminSummary = (year, month) =>
  axios.get(`${BASE_URL}/sales-admin/summary`, {
    ...authHeader(),
    params: { year, month },
  });
export const fetchSalesAdminLockStatus = (salesUsername, year, month) =>
  axios.get(`${BASE_URL}/sales-admin/lock-status`, {
    ...authHeader(),
    params: { salesUsername, year, month },
  });
export const toggleSalesMonthLock = (salesUsername, year, month, locked) =>
  axios.post(
    `${BASE_URL}/sales-admin/lock`,
    { salesUsername, year, month, locked },
    authHeader(),
  );

export const fetchAdminReceipts = (salesUsername, year, month) =>
  axios.get(`${BASE_URL}/sales-admin/receipt`, {
    ...authHeader(),
    params: { salesUsername, year, month },
  });
export const addAdminReceipt = (data) =>
  axios.post(`${BASE_URL}/sales-admin/receipt`, data, authHeader());
export const updateAdminReceipt = (id, data) =>
  axios.put(`${BASE_URL}/sales-admin/receipt/${id}`, data, authHeader());
export const deleteAdminReceipt = (id) =>
  axios.delete(`${BASE_URL}/sales-admin/receipt/${id}`, authHeader());

export const fetchAdminDriving = (salesUsername, year, month) =>
  axios.get(`${BASE_URL}/sales-admin/driving`, {
    ...authHeader(),
    params: { salesUsername, year, month },
  });
export const addAdminDriving = (data) =>
  axios.post(`${BASE_URL}/sales-admin/driving`, data, authHeader());
export const updateAdminDriving = (id, data) =>
  axios.put(`${BASE_URL}/sales-admin/driving/${id}`, data, authHeader());
export const deleteAdminDriving = (id) =>
  axios.delete(`${BASE_URL}/sales-admin/driving/${id}`, authHeader());
