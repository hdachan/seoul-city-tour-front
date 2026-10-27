import axios from "axios";
import client, { BASE_URL } from "./client";

// ── 로그인 (POST 방식으로 변경, 토큰 발급) ──
// remember: 로그인 유지 (서버가 30일짜리 토큰을 줌)
export const login = async (username, password, remember = false) => {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    username,
    password,
    remember,
  });
  return response.data; // { token, username, role, name }
};

// 계정 관리
export const fetchAdminUsers = () => client.get(`/admin/users`);
export const createUser = (username, password, role, name) =>
  client.post(`/admin/users/create`, { username, password, role, name });
export const deleteUser = (id) => client.delete(`/admin/users/${id}`);

// 운행 기록
export const addRecord = (data) => client.post(`/record/add`, data);
export const removeRecord = (id) => client.delete(`/record/${id}`);
export const fetchCategories = (type) =>
  client.get(`/record/categories/${type}`);
export const addCategory = (type, name, price) =>
  client.post(`/record/categories`, { type, name, price });
export const removeCategory = (id) => client.delete(`/record/categories/${id}`);

// 업체별 정산
export const fetchPlatforms = () => client.get(`/settlement/platforms`);
export const addPlatform = (name, region, memo) =>
  client.post(`/settlement/platforms`, { name, region, memo });
export const removePlatform = (id) =>
  client.delete(`/settlement/platforms/${id}`);
export const fetchMonthlySettlement = (year, month) =>
  client.get(`/settlement/monthly`, {
    params: { year, month },
  });
export const saveSettlement = (platformId, year, month, amount, memo) =>
  client.post(`/settlement/save`, { platformId, year, month, amount, memo });
export const fetchYearlySettlement = (year) =>
  client.get(`/settlement/yearly`, {
    params: { year },
  });

// 인삼 매출
export const fetchGinsengPrice = () => client.get(`/ginseng/price`);
export const saveGinsengPrice = (pricePerUnit) =>
  client.post(`/ginseng/price`, { pricePerUnit });
export const fetchGuides = () => client.get(`/ginseng/guides`);
export const fetchAllGuides = () => client.get(`/ginseng/guides/all`);
export const addGinsengGuide = (name) =>
  client.post(`/ginseng/guides`, { name });
export const toggleGinsengGuide = (id) =>
  client.post(`/ginseng/guides/${id}/toggle`, {});
export const fetchGinsengMonthly = (year, month) =>
  client.get(`/ginseng/monthly`, {
    params: { year, month },
  });
export const saveGinsengRecord = (guideName, date, count) =>
  client.post(`/ginseng/save`, { guideName, date, count });

// 가이드 정산폼
export const fetchExpenseCategories = (tourNameId, tourName) =>
  client.get(
    `/guide-form/expense-categories${tourNameId ? `?tourNameId=${tourNameId}` : tourName ? `?tourName=${encodeURIComponent(tourName)}` : ""}`
  );
export const fetchGuideStats = (username, year, month) =>
  client.get(`/guide-form/stats`, { params: { username, year, month } });
export const fetchAdminDailyStats = (year, month) =>
  client.get(`/guide-admin/stats/daily`, { params: { year, month } });
export const fetchAdminStats = (year, month) =>
  client.get(`/guide-admin/stats`, {
    params: { year, month },
  });
export const fetchAdminExpenseCategories = (tourNameId) =>
  client.get(
    `/guide-admin/expense-categories${tourNameId ? `?tourNameId=${tourNameId}` : ""}`
  );
export const addExpenseCategory = (name, tourNameId) =>
  client.post(`/guide-admin/expense-categories`, { name, tourNameId });
export const deleteExpenseCategory = (id) =>
  client.delete(`/guide-admin/expense-categories/${id}`);
export const fetchTourNames = () => client.get(`/guide-form/tour-names`);
export const addTourName = (name) =>
  client.post(`/guide-admin/tour-names`, { name });
export const deleteTourName = (id) =>
  client.delete(`/guide-admin/tour-names/${id}`);
export const fetchGuideLockStatus = (year, month) =>
  client.get(
    `/guide-form/lock-status${year ? `?year=${year}&month=${month}` : ""}`
  );
export const fetchGuideRecords = (year, month) =>
  client.get(
    `/guide-form/records${year ? `?year=${year}&month=${month}` : ""}`
  );
export const addGuideRecord = (data) =>
  client.post(`/guide-form/records`, data);
export const updateGuideRecord = (id, data) =>
  client.put(`/guide-form/records/${id}`, data);
export const deleteGuideRecord = (id) =>
  client.delete(`/guide-form/records/${id}`);
export const fetchGuideExpense = (year, month) =>
  client.get(
    `/guide-form/expense${year ? `?year=${year}&month=${month}` : ""}`
  );
export const addGuideExpense = (data) =>
  client.post(`/guide-form/expense`, data);
export const updateGuideExpense = (id, data) =>
  client.put(`/guide-form/expense/${id}`, data);
export const deleteGuideExpense = (id) =>
  client.delete(`/guide-form/expense/${id}`);
export const fetchGuideDailyFee = (year, month) =>
  client.get(
    `/guide-form/daily-fee${year ? `?year=${year}&month=${month}` : ""}`
  );
export const addGuideDailyFee = (amount, date) =>
  client.post(`/guide-form/daily-fee`, { amount, date });
export const updateGuideDailyFee = (id, amount, date) =>
  client.put(`/guide-form/daily-fee/${id}`, { amount, date });
export const deleteGuideDailyFee = (id) =>
  client.delete(`/guide-form/daily-fee/${id}`);

// 관리자용 가이드 정산
export const fetchAdminSummary = (year, month) =>
  client.get(`/guide-admin/summary`, {
    params: { year, month },
  });
export const fetchAdminLockStatus = (guideUsername, year, month) =>
  client.get(`/guide-admin/lock-status`, {
    params: { guideUsername, year, month },
  });
export const toggleMonthLock = (guideUsername, year, month, locked) =>
  client.post(`/guide-admin/lock`, { guideUsername, year, month, locked });
export const fetchAdminGuideIncome = (guideUsername, year, month) =>
  client.get(`/guide-admin/income`, {
    params: { guideUsername, year, month },
  });
export const addAdminIncome = (data) =>
  client.post(`/guide-admin/income`, data);
export const updateAdminIncome = (id, data) =>
  client.put(`/guide-admin/income/${id}`, data);
export const deleteAdminIncome = (id) =>
  client.delete(`/guide-admin/income/${id}`);
export const fetchAdminGuideExpense = (guideUsername, year, month) =>
  client.get(`/guide-admin/expense`, {
    params: { guideUsername, year, month },
  });
export const addAdminExpense = (data) =>
  client.post(`/guide-admin/expense`, data);
export const updateAdminExpense = (id, data) =>
  client.put(`/guide-admin/expense/${id}`, data);
export const deleteAdminExpense = (id) =>
  client.delete(`/guide-admin/expense/${id}`);
export const fetchAdminGuideDailyFee = (guideUsername, year, month) =>
  client.get(`/guide-admin/daily-fee`, {
    params: { guideUsername, year, month },
  });
export const addAdminDailyFee = (data) =>
  client.post(`/guide-admin/daily-fee`, data);
export const updateAdminDailyFee = (id, amount, date) =>
  client.put(`/guide-admin/daily-fee/${id}`, { amount, date });
export const deleteAdminDailyFee = (id) =>
  client.delete(`/guide-admin/daily-fee/${id}`);

// 계정 관리 (수정)
export const updateUser = (id, data) => client.put(`/admin/users/${id}`, data);

// 개발자 (권한 · 탭)  — fetchRoles 는 계정 관리에서도 사용
export const fetchTabPermissions = (role) =>
  client.get(`/dev/permissions/${encodeURIComponent(role)}`);
export const fetchRoles = () => client.get(`/dev/roles`);
export const fetchTabs = () => client.get(`/dev/tabs`);
export const addRole = (data) => client.post(`/dev/roles`, data);
export const updateRole = (id, data) => client.put(`/dev/roles/${id}`, data);
export const deleteRole = (id) => client.delete(`/dev/roles/${id}`);

// 운행 기록 (월별 · 통계 · 수정)
export const fetchRecordsByMonth = (year, month) =>
  client.get(`/record/list`, {
    params: { year, month },
  });
export const fetchStats = (year) =>
  client.get(`/record/stats`, { params: { year } });
export const updateRecord = (id, data) => client.put(`/record/${id}`, data);

// 업체별 정산 (수정)
export const updatePlatform = (id, data) =>
  client.put(`/settlement/platforms/${id}`, data);
