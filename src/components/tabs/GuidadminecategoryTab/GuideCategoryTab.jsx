import { useState } from "react";
import {
  fetchTourNames,
  addTourName,
  deleteTourName,
  fetchAdminExpenseCategories,
  addExpenseCategory,
  deleteExpenseCategory,
} from "../../../api/auth";

export default function GuideCategoryTab({
  activeMainTab,
  tourNames,
  setTourNames,
  expenseCategories,
  setExpenseCategories,
  setSuccess,
  setError,
}) {
  const [newTourName, setNewTourName] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [selectedTourForExpense, setSelectedTourForExpense] = useState("");

  return (
    <>
      {activeMainTab === "category" && (
        <div>
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              border: "1px solid #e8eaed",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              투어 카테고리 추가
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTourName.trim()) return;
                addTourName(newTourName.trim())
                  .then(() => {
                    setNewTourName("");
                    fetchTourNames().then((r) => setTourNames(r.data));
                    setSuccess("추가되었습니다.");
                  })
                  .catch((err) =>
                    setError(err.response?.data?.error || "추가 실패"),
                  );
              }}
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <input
                type="text"
                placeholder="투어 이름"
                value={newTourName}
                onChange={(e) => setNewTourName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  border: "1.5px solid #d8dce3",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button type="submit" className="btn-primary">
                추가
              </button>
            </form>
          </div>
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>투어명</th>
                  <th style={{ width: "70px" }}></th>
                </tr>
              </thead>
              <tbody>
                {tourNames.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="empty">
                      없음
                    </td>
                  </tr>
                ) : (
                  tourNames.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.name}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => {
                            if (window.confirm("삭제할까요?"))
                              deleteTourName(t.id)
                                .then(() => {
                                  fetchTourNames().then((r) =>
                                    setTourNames(r.data),
                                  );
                                  setSuccess("삭제되었습니다.");
                                })
                                .catch((err) =>
                                  setError(
                                    err.response?.data?.error || "삭제 실패",
                                  ),
                                );
                          }}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeMainTab === "expense-category" && (
        <div>
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              border: "1px solid #e8eaed",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              지출 카테고리 추가
            </h3>
            <div style={{ marginBottom: "10px" }}>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#444",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                투어 선택 *
              </label>
              <select
                value={selectedTourForExpense}
                onChange={(e) => {
                  setSelectedTourForExpense(e.target.value);
                  fetchAdminExpenseCategories(
                    e.target.value ? Number(e.target.value) : null,
                  )
                    .then((r) => setExpenseCategories(r.data))
                    .catch(() => {});
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="">투어를 선택하세요</option>
                {tourNames.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newExpenseCategory.trim()) return;
                if (!selectedTourForExpense) {
                  setError("투어를 먼저 선택해주세요.");
                  return;
                }
                addExpenseCategory(
                  newExpenseCategory.trim(),
                  Number(selectedTourForExpense),
                )
                  .then(() => {
                    setNewExpenseCategory("");
                    fetchAdminExpenseCategories(
                      Number(selectedTourForExpense),
                    ).then((r) => setExpenseCategories(r.data));
                    setSuccess("추가되었습니다.");
                  })
                  .catch((err) =>
                    setError(err.response?.data?.error || "추가 실패"),
                  );
              }}
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <input
                type="text"
                placeholder="카테고리 이름"
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  border: "1.5px solid #d8dce3",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              <button type="submit" className="btn-primary">
                추가
              </button>
            </form>
          </div>
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>투어</th>
                  <th>카테고리명</th>
                  <th style={{ width: "70px" }}></th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      없음
                    </td>
                  </tr>
                ) : (
                  expenseCategories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontSize: "12px", color: "#888" }}>
                        {tourNames.find((t) => t.id === c.tourNameId)?.name ||
                          "-"}
                      </td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => {
                            if (window.confirm("삭제할까요?"))
                              deleteExpenseCategory(c.id)
                                .then(() => {
                                  fetchAdminExpenseCategories(
                                    selectedTourForExpense
                                      ? Number(selectedTourForExpense)
                                      : null,
                                  ).then((r) => setExpenseCategories(r.data));
                                  setSuccess("삭제되었습니다.");
                                })
                                .catch((err) =>
                                  setError(
                                    err.response?.data?.error || "삭제 실패",
                                  ),
                                );
                          }}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
