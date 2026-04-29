import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const authHeader = () => ({
  auth: {
    username: sessionStorage.getItem('username'),
    password: sessionStorage.getItem('password'),
  }
});

export const login = async (username, password) => {
  const response = await axios.get(`${BASE_URL}/me`, {
    auth: { username, password }, withCredentials: true,
  });
  return response.data;
};

// 계정 관리
export const fetchAdminUsers = () => axios.get(`${BASE_URL}/admin/users`, authHeader());
export const createUser = (username, password, role, name) =>
  axios.post(`${BASE_URL}/admin/users/create`, { username, password, role, name }, authHeader());
export const deleteUser = (id) => axios.delete(`${BASE_URL}/admin/users/${id}`, authHeader());

// 운행 기록
export const fetchRecords    = () => axios.get(`${BASE_URL}/record/list`, authHeader());
export const addRecord       = (data) => axios.post(`${BASE_URL}/record/add`, data, authHeader());
export const removeRecord    = (id) => axios.delete(`${BASE_URL}/record/${id}`, authHeader());
export const fetchCategories = (type) => axios.get(`${BASE_URL}/record/categories/${type}`, authHeader());
export const addCategory     = (type, name, price) => axios.post(`${BASE_URL}/record/categories`, { type, name, price }, authHeader());
export const removeCategory  = (id) => axios.delete(`${BASE_URL}/record/categories/${id}`, authHeader());

// 업체별 정산
export const fetchPlatforms  = () => axios.get(`${BASE_URL}/settlement/platforms`, authHeader());
export const addPlatform     = (name) => axios.post(`${BASE_URL}/settlement/platforms`, { name }, authHeader());
export const removePlatform  = (id) => axios.delete(`${BASE_URL}/settlement/platforms/${id}`, authHeader());
export const fetchMonthlySettlement = (year, month) =>
  axios.get(`${BASE_URL}/settlement/monthly`, { ...authHeader(), params: { year, month } });
export const saveSettlement  = (platformId, year, month, amount, region, memo) =>
  axios.post(`${BASE_URL}/settlement/save`, { platformId, year, month, amount, region, memo }, authHeader());
export const deleteSettlement = (id) => axios.delete(`${BASE_URL}/settlement/${id}`, authHeader());
export const fetchYearlySettlement = (year) =>
  axios.get(`${BASE_URL}/settlement/yearly`, { ...authHeader(), params: { year } });

// 인삼 매출
export const fetchGinsengPrice   = () => axios.get(`${BASE_URL}/ginseng/price`, authHeader());
export const saveGinsengPrice    = (pricePerUnit) => axios.post(`${BASE_URL}/ginseng/price`, { pricePerUnit }, authHeader());
export const fetchGuides         = () => axios.get(`${BASE_URL}/ginseng/guides`, authHeader());
export const fetchAllGuides      = () => axios.get(`${BASE_URL}/ginseng/guides/all`, authHeader());
export const addGinsengGuide     = (name) => axios.post(`${BASE_URL}/ginseng/guides`, { name }, authHeader());
export const toggleGinsengGuide  = (id) => axios.post(`${BASE_URL}/ginseng/guides/${id}/toggle`, {}, authHeader());
export const fetchGinsengMonthly = (year, month) =>
  axios.get(`${BASE_URL}/ginseng/monthly`, { ...authHeader(), params: { year, month } });
export const saveGinsengRecord   = (guideName, date, count) =>
  axios.post(`${BASE_URL}/ginseng/save`, { guideName, date, count }, authHeader());
export const deleteGinsengRecord = (id) => axios.delete(`${BASE_URL}/ginseng/${id}`, authHeader());

// 가이드 정산폼
export const fetchTourNames     = () => axios.get(`${BASE_URL}/guide-form/tour-names`, authHeader());
export const addTourName        = (name) => axios.post(`${BASE_URL}/guide-form/tour-names`, { name }, authHeader());
export const deleteTourName     = (id) => axios.delete(`${BASE_URL}/guide-form/tour-names/${id}`, authHeader());

export const fetchGuideRecords  = (year, month) =>
  axios.get(`${BASE_URL}/guide-form/records`, { ...authHeader(), params: { year, month } });
export const addGuideRecord     = (data) => axios.post(`${BASE_URL}/guide-form/records`, data, authHeader());
export const deleteGuideRecord  = (id) => axios.delete(`${BASE_URL}/guide-form/records/${id}`, authHeader());

export const fetchGuideExpense  = (year, month) =>
  axios.get(`${BASE_URL}/guide-form/expense`, { ...authHeader(), params: { year, month } });
export const addGuideExpense    = (data) => axios.post(`${BASE_URL}/guide-form/expense`, data, authHeader());
export const deleteGuideExpense = (id) => axios.delete(`${BASE_URL}/guide-form/expense/${id}`, authHeader());

export const fetchGuideDailyFee  = (year, month) =>
  axios.get(`${BASE_URL}/guide-form/daily-fee`, { ...authHeader(), params: { year, month } });
export const addGuideDailyFee    = (amount, date) =>
  axios.post(`${BASE_URL}/guide-form/daily-fee`, { amount, date }, authHeader());
export const deleteGuideDailyFee = (id) => axios.delete(`${BASE_URL}/guide-form/daily-fee/${id}`, authHeader());
