import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const authHeader = () => ({
  auth: {
    username: sessionStorage.getItem('username'),
    password: sessionStorage.getItem('password'),
  }
});

// 로그인
export const login = async (username, password) => {
  const response = await axios.get(`${BASE_URL}/me`, {
    auth: { username, password },
    withCredentials: true,
  });
  return response.data;
};

// 관리자 - 계정 관리
export const fetchAdminUsers = () =>
  axios.get(`${BASE_URL}/admin/users`, authHeader());

export const createUser = (username, password, role, name) =>
  axios.post(`${BASE_URL}/admin/users/create`, { username, password, role, name }, authHeader());

export const deleteUser = (id) =>
  axios.delete(`${BASE_URL}/admin/users/${id}`, authHeader());

// ── 운행 기록 ──
export const fetchRecords = () =>
  axios.get(`${BASE_URL}/record/list`, authHeader());

export const addRecord = (data) =>
  axios.post(`${BASE_URL}/record/add`, data, authHeader());

export const removeRecord = (id) =>
  axios.delete(`${BASE_URL}/record/${id}`, authHeader());

// ── 카테고리 ──
export const fetchCategories = (type) =>
  axios.get(`${BASE_URL}/record/categories/${type}`, authHeader());

export const addCategory = (type, name, price) =>
  axios.post(`${BASE_URL}/record/categories`, { type, name, price }, authHeader());

export const removeCategory = (id) =>
  axios.delete(`${BASE_URL}/record/categories/${id}`, authHeader());

// 역할별 API
export const fetchSalesCustomers = () =>
  axios.get(`${BASE_URL}/sales/customers`, authHeader());

export const fetchGuideContent = () =>
  axios.get(`${BASE_URL}/guide/content`, authHeader());

export const fetchDevMonitor = () =>
  axios.get(`${BASE_URL}/dev/monitor`, authHeader());
