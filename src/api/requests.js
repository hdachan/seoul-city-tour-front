import client from "./client";

// ✉️ 요청사항 (관리자 → 영업·가이드)
export const requestsApi = {
  // 관리자
  getTargets: () => client.get(`/requests/admin/targets`),
  getAll: () => client.get(`/requests/admin`),
  send: (toUsernames, content) => client.post(`/requests/admin`, { toUsernames, content }),
  remove: (id) => client.delete(`/requests/admin/${id}`),
  // 받는 사람
  getMine: () => client.get(`/requests/mine`),
  markRead: (id) => client.post(`/requests/${id}/read`),
  markDone: (id) => client.post(`/requests/${id}/done`),
};
