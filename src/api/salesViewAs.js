import { salesAdminApi } from "./sales";

// 👤 관리자가 영업 사원 한 명의 💼 영업 정산 화면을 "그 사람이 보는 그대로" 볼 때
//   salesApi / salesHolidayApi 와 같은 모양 (관리자 조회 API 를 그 사람 이름으로 부름)
//   보기 전용: 저장 · 수정 · 삭제는 모두 막음 (고치는 건 관리자 화면에서)
export const VIEW_AS_READ_ONLY = "보기 전용이에요. 고치려면 🛠 관리자 화면에서 해주세요.";
export function salesViewAsApis({ username: u, cardNumber = "" }) {
  const a = salesAdminApi;
  const readOnly = () => Promise.reject({ response: { data: { error: VIEW_AS_READ_ONLY } } });
  const api = {
    getLockStatus: (y, m) => a.getLockStatus(u, y, m),
    getMyCard: () => Promise.resolve({ data: { cardNumber } }),
    getCategories: () => a.getCategories(),
    getDriving: (y, m) => a.getDriving(u, y, m),
    getDrivingDate: (date) => a.getDrivingDate(u, date),
    getPersonalFuelBalance: (y, m) => a.getPersonalFuelBalance(u, y, m),
    getPrevMeter: (date) => a.getPrevMeter(u, date),
    getStartMeter: () => Promise.resolve({ data: { needed: false } }),
    getReceipts: (y, m) => a.getReceipts(u, y, m),
    getDailyNote: (date) => a.getDailyNote(u, date),
    saveMyCard: readOnly,
    saveStartMeter: readOnly,
    saveDrivingNotes: readOnly,
    addDriving: readOnly,
    updateDriving: readOnly,
    deleteDriving: readOnly,
    addReceipt: readOnly,
    updateReceipt: readOnly,
    deleteReceipt: readOnly,
    saveDailyNote: readOnly,
  };
  const holidayApi = {
    // 관리자 요약에 사람마다 휴무 목록이 들어 있음
    getMine: (y, m) =>
      a.getSummary(y, m).then((r) => ({
        data: (r.data || []).find((x) => x.username === u)?.holidays || [],
      })),
    save: readOnly,
    remove: readOnly,
  };
  return { api, holidayApi };
}
