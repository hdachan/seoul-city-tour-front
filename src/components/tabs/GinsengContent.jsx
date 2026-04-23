import { useEffect, useState, useCallback } from 'react';
import {
  fetchGinsengPrice, saveGinsengPrice,
  fetchGuides, fetchGinsengMonthly, saveGinsengRecord
} from '../../api/auth';
import './GinsengContent.css';

export default function GinsengContent() {
  const now   = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [guides, setGuides]       = useState([]);
  const [records, setRecords]     = useState([]);
  const [price, setPrice]         = useState(5000);
  const [editPrice, setEditPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(5000);
  const [cellMap, setCellMap]     = useState({});  // "guideName_day" → count
  const [saving, setSaving]       = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // 해당 월 일수
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const load = useCallback(async () => {
    try {
      const [g, p, r] = await Promise.all([
        fetchGuides(),
        fetchGinsengPrice(),
        fetchGinsengMonthly(year, month),
      ]);
      setGuides(g.data);
      setPrice(p.data.pricePerUnit);
      setTempPrice(p.data.pricePerUnit);
      setRecords(r.data);

      // cellMap 세팅
      const map = {};
      r.data.forEach(rec => {
        const day = Number(rec.date.split('-')[2]);
        map[`${rec.guideName}_${day}`] = rec.count;
      });
      setCellMap(map);
    } catch { setError('데이터를 불러오지 못했습니다.'); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // 단가 저장
  const handleSavePrice = async () => {
    try {
      await saveGinsengPrice(Number(tempPrice));
      setPrice(Number(tempPrice));
      setEditPrice(false);
      setSuccess('단가가 저장되었습니다.');
    } catch { setError('단가 저장 실패'); }
  };

  // 셀 값 변경 후 저장
  const handleCellChange = (guideName, day, value) => {
    const key = `${guideName}_${day}`;
    setCellMap(prev => ({ ...prev, [key]: value }));
  };

  const handleCellBlur = async (guideName, day) => {
    const key   = `${guideName}_${day}`;
    const value = cellMap[key];
    if (value === '' || value === undefined || value === null) return;
    const count = parseFloat(value);
    if (isNaN(count) || count < 0) return;

    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setSaving(key);
    try {
      await saveGinsengRecord(guideName, dateStr, count);
    } catch { setError('저장 실패'); }
    finally { setSaving(''); }
  };

  // 가이드별 합계
  const guideTotal = (guideName) => {
    return days.reduce((sum, day) => {
      const v = parseFloat(cellMap[`${guideName}_${day}`] || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  };

  // 전체 합계
  const grandTotal = guides.reduce((sum, g) => sum + guideTotal(g.name), 0);

  // 정산금액
  const settlement = (guideName) => Math.round(guideTotal(guideName) * price);

  // 퍼센트
  const percent = (guideName) => {
    if (grandTotal === 0) return '0%';
    return (guideTotal(guideName) / grandTotal * 100).toFixed(1) + '%';
  };

  const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="ginseng-wrapper">
      {/* 툴바 */}
      <div className="ginseng-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="g-select">
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="g-select">
            {months.map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>

        {/* 단가 설정 */}
        <div className="price-area">
          <span className="price-label">인삼 단가</span>
          {editPrice ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="number" value={tempPrice}
                onChange={e => setTempPrice(e.target.value)}
                className="price-input" />
              <span style={{ fontSize: '13px', color: '#555' }}>원</span>
              <button className="btn-primary" onClick={handleSavePrice}>저장</button>
              <button className="btn-outline" onClick={() => { setEditPrice(false); setTempPrice(price); }}>취소</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="price-value">{price.toLocaleString()}원</span>
              <button className="btn-outline" onClick={() => setEditPrice(true)}>수정</button>
            </div>
          )}
        </div>
      </div>

      {error   && <div className="alert alert-error">⚠ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* 스프레드시트 */}
      <div className="ginseng-table-wrap">
        <table className="ginseng-table">
          <thead>
            <tr>
              <th className="th-guide">{month}월</th>
              {days.map(d => (
                <th key={d} className="th-day">{d}</th>
              ))}
              <th className="th-sum">합계</th>
              <th className="th-sum">정산금액</th>
              <th className="th-sum">비율</th>
            </tr>
          </thead>
          <tbody>
            {guides.length === 0 ? (
              <tr><td colSpan={days.length + 4} className="empty">등록된 가이드가 없습니다.</td></tr>
            ) : guides.map(g => (
              <tr key={g.id}>
                <td className="td-guide">{g.name}</td>
                {days.map(day => {
                  const key = `${g.name}_${day}`;
                  return (
                    <td key={day} className="td-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className={`cell-input ${saving === key ? 'saving' : ''}`}
                        value={cellMap[key] ?? ''}
                        onChange={e => handleCellChange(g.name, day, e.target.value)}
                        onBlur={() => handleCellBlur(g.name, day)}
                      />
                    </td>
                  );
                })}
                <td className="td-total">{guideTotal(g.name) || '-'}</td>
                <td className="td-settle">{guideTotal(g.name) ? settlement(g.name).toLocaleString() + '원' : '-'}</td>
                <td className="td-percent">{guideTotal(g.name) ? percent(g.name) : '-'}</td>
              </tr>
            ))}
          </tbody>
          {/* 전체 합계 */}
          {guides.length > 0 && (
            <tfoot>
              <tr>
                <td className="td-guide" style={{ fontWeight: 700 }}>전체 합계</td>
                {days.map(day => {
                  const dayTotal = guides.reduce((sum, g) => {
                    const v = parseFloat(cellMap[`${g.name}_${day}`] || 0);
                    return sum + (isNaN(v) ? 0 : v);
                  }, 0);
                  return (
                    <td key={day} className="td-cell" style={{ fontWeight: 600, color: '#1d4ed8', textAlign: 'center', fontSize: '11px' }}>
                      {dayTotal > 0 ? dayTotal : ''}
                    </td>
                  );
                })}
                <td className="td-total" style={{ fontWeight: 700 }}>{grandTotal}</td>
                <td className="td-settle" style={{ fontWeight: 700 }}>
                  {Math.round(grandTotal * price).toLocaleString()}원
                </td>
                <td className="td-percent">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="ginseng-hint">셀에 숫자 입력 후 탭/클릭 이동하면 자동 저장됩니다.</p>
    </div>
  );
}
