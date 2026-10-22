import axios from "axios";

// 서버 주소 (.env 의 REACT_APP_API_URL)
export const BASE_URL = process.env.REACT_APP_API_URL;

// 서버 호출 공용 axios
// - 주소 앞부분(BASE_URL)을 자동으로 붙임  →  client.get("/sales-form/driving")
// - 로그인 토큰이 있으면 Authorization 헤더를 자동으로 붙임
const client = axios.create({ baseURL: BASE_URL });

client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
