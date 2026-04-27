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
export const fetchAdminUsers  = () => axios.get(`${BASE_URL}/admin/users`, authHeader());
export const createUser = (username, password, role, name) =>
  axios.post(`${BASE_URL}/admin/users/create`, { username, password, role, name }, authHeader());
export const deleteUser = (id) => axios.delete(`${BASE_URL}/admin/users/${id}`, authHeader());

// 운행 기록
export const fetchRecords     = () => axios.get(`${BASE_URL}/record/list`, authHeader());
export const addRecord        = (data) => axios.post(`${BASE_URL}/record/add`, data, authHeader());
export const removeRecord     = (id) => axios.delete(`${BASE_URL}/record/${id}`, authHeader());
export const fetchCategories  = (type) => axios.get(`${BASE_URL}/record/categories/${type}`, authHeader());
export const addCategory      = (type, name, price) => axios.post(`${BASE_URL}/record/categories`, { type, name, price }, authHeader());
export const removeCategory   = (id) => axios.delete(`${BASE_URL}/record/categories/${id}`, authHeader());

// 업체별 정산
export const fetchPlatforms   = () => axios.get(`${BASE_URL}/settlement/platforms`, authHeader());
export const addPlatform      = (name) => axios.post(`${BASE_URL}/settlement/platforms`, { name }, authHeader());
export const removePlatform   = (id) => axios.delete(`${BASE_URL}/settlement/platforms/${id}`, authHeader());
export const fetchMonthlySettlement = (year, month) =>
  axios.get(`${BASE_URL}/settlement/monthly`, { ...authHeader(), params: { year, month } });
export const saveSettlement   = (platformId, year, month, amount, region, memo) =>
  axios.post(`${BASE_URL}/settlement/save`, { platformId, year, month, amount, region, memo }, authHeader());
export const deleteSettlement = (id) => axios.delete(`${BASE_URL}/settlement/${id}`, authHeader());
export const fetchYearlySettlement = (year) =>
  axios.get(`${BASE_URL}/settlement/yearly`, { ...authHeader(), params: { year } });

// 인삼 매출
export const fetchGinsengPrice   = () => axios.get(`${BASE_URL}/ginseng/price`, authHeader());
export const saveGinsengPrice    = (pricePerUnit) => axios.post(`${BASE_URL}/ginseng/price`, { pricePerUnit }, authHeader());
export const fetchGuides         = () => axios.get(`${BASE_URL}/ginseng/guides`, authHeader());          // 활성만
export const fetchAllGuides      = () => axios.get(`${BASE_URL}/ginseng/guides/all`, authHeader());      // 전체
export const addGinsengGuide     = (name) => axios.post(`${BASE_URL}/ginseng/guides`, { name }, authHeader());
export const toggleGinsengGuide  = (id) => axios.post(`${BASE_URL}/ginseng/guides/${id}/toggle`, {}, authHeader());
export const fetchGinsengMonthly = (year, month) =>
  axios.get(`${BASE_URL}/ginseng/monthly`, { ...authHeader(), params: { year, month } });
export const saveGinsengRecord   = (guideName, date, count) =>
  axios.post(`${BASE_URL}/ginseng/save`, { guideName, date, count }, authHeader());
export const deleteGinsengRecord = (id) => axios.delete(`${BASE_URL}/ginseng/${id}`, authHeader());
