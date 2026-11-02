// 운행일지 · 주유 입력 중인 값을 임시 보관 (브라우저에만, DB 저장 아님)
//  - 튕기거나 새로고침, 창을 닫아도 남고 같은 날짜에서 다시 열면 불러옴
//  - 저장 성공 · 취소 버튼 · 로그아웃 때 지움
//  - 로그인한 사람 · 정산 대상 · 운행/주유 창별로 따로 보관
const PREFIX = "sl-driving-draft:";
const INPUT_KEYS = [
  "destination",
  "departureTime",
  "arrivalTime",
  "meterReading",
  "fuelAmount",
  "fuelCost",
  "fuelUnitPrice",
];

function safeLocal(fn) {
  try {
    return fn(window.localStorage);
  } catch {
    return null; // 저장소를 못 쓰는 환경이면 임시 보관 없이 그냥 동작
  }
}

// 사람이 입력한 값이 하나라도 있는지 (날짜 · 구분만 있으면 입력 안 한 것)
const hasInput = (form) =>
  INPUT_KEYS.some((k) => form[k]) ||
  (form.notes || []).some((n) => n.content || n.time);

// 입력창을 새로 열 때 보관 정보 + 불러온 값 (없으면 form 은 null)
export function openDraft(target, type, openedOn) {
  const login = sessionStorage.getItem("username");
  const kind = type === "주유" ? "fuel" : "drive";
  const key = `${PREFIX}${login}:${target}:${kind}`;
  const saved = safeLocal((ls) => JSON.parse(ls.getItem(key)));
  const form = saved?.openedOn === openedOn ? saved.form : null;
  return { key, openedOn, restored: !!form, form };
}

export function saveDraft(draft, form) {
  safeLocal((ls) => {
    if (hasInput(form)) {
      ls.setItem(draft.key, JSON.stringify({ openedOn: draft.openedOn, form }));
    } else {
      ls.removeItem(draft.key);
    }
  });
}

export function clearDraft(draft) {
  safeLocal((ls) => ls.removeItem(draft.key));
}

// 로그아웃 때 전부 지움 (공용 PC에서 다음 사람에게 남지 않게)
export function clearAllDrafts() {
  safeLocal((ls) =>
    Object.keys(ls)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => ls.removeItem(k)),
  );
}
