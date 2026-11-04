import { useEffect, useState } from "react";
import TotalStats from "./TotalStats";
import SalesDrivingStats from "./SalesDrivingStats";
import { salesAdminApi as api } from "../../../api/sales";
import { useDateRollover } from "../../../utils/useToday";
import "./sales.css";

// 📊 영업 정산 통계 탭: 전체 통계 → 이름을 누르면 그 사람 통계 (조회만)
export default function SalesAdminStatsTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");

  const loadSummary = () => {
    setError("");
    api
      .getSummary(year, month)
      .then((r) => setSummary(r.data))
      .catch(() => setError("데이터를 불러오지 못했습니다."));
  };

  useEffect(() => {
    loadSummary();
  }, [year, month]);

  // 자정이 지나면 다시 불러옴 (월이 넘어가면 새 달로 이동)
  useDateRollover((prev, next) => {
    const [py, pm] = prev.split("-").map(Number);
    const [ny, nm] = next.split("-").map(Number);
    if (year === py && month === pm && (ny !== py || nm !== pm)) {
      setYear(ny);
      setMonth(nm);
    } else {
      loadSummary();
    }
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="sac-wrapper">
      {error && (
        <div className="sl-alert sl-alert-error" onClick={() => setError("")}>
          ⚠ {error}
        </div>
      )}

      {selectedUser ? (
        <>
          <div className="sac-filter-bar">
            <button className="sl-btn-back" onClick={() => setSelectedUser(null)}>
              ← 전체 통계
            </button>
            <select
              className="sl-select is-compact"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              className="sl-select is-compact"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <span className="sl-filter-name">{selectedUser.name}</span>
          </div>
          <div className="sl-tab-panel">
            <SalesDrivingStats
              username={selectedUser.username}
              name={selectedUser.name}
              year={year}
              month={month}
            />
          </div>
        </>
      ) : (
        <TotalStats
          summary={summary}
          year={year}
          month={month}
          years={years}
          months={months}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onUserClick={setSelectedUser}
        />
      )}
    </div>
  );
}
