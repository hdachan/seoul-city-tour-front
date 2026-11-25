import client from "./client";
import { salesAdminApi } from "./sales";
import { makeSalesFormApi } from "./salesFormApi";

// 👤 관리자가 영업 사원 한 명의 💼 영업 정산 화면을 "그 사람 그대로" 쓸 때
//   영업 본인과 같은 서버 주소(/sales-form)를 부르고, 머리에 X-View-As: 그 사람 아이디 를 붙임
//   → 서버가 그 사람으로 동작: 잠금 · 미터기 · 저장 규칙 · 오류가 영업 본인과 완전히 같음 (추가 · 수정 · 삭제도 실제로 저장)
//   (서버는 영업 정산관리 권한이 있는 사람만 허용)
export const VIEW_AS_HEADER = "X-View-As";

export function viewAsHttp(username) {
  const withHeader = (cfg = {}) => ({
    ...cfg,
    headers: { ...(cfg.headers || {}), [VIEW_AS_HEADER]: username },
  });
  return {
    get: (url, cfg) => client.get(url, withHeader(cfg)),
    post: (url, data, cfg) => client.post(url, data, withHeader(cfg)),
    put: (url, data, cfg) => client.put(url, data, withHeader(cfg)),
    delete: (url, cfg) => client.delete(url, withHeader(cfg)),
  };
}

export function salesViewAsApis({ username }) {
  const api = makeSalesFormApi(viewAsHttp(username));
  const holidayApi = {
    // 관리자 요약에 사람마다 휴무 목록이 들어 있음 (영업 정산 화면은 보기만 함)
    getMine: (y, m) =>
      salesAdminApi.getSummary(y, m).then((r) => ({
        data: (r.data || []).find((x) => x.username === username)?.holidays || [],
      })),
  };
  return { api, holidayApi };
}
