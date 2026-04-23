import { useEffect, useState } from 'react';
import {
  fetchPlatforms, addPlatform, removePlatform,
  fetchMonthlySettlement, saveSettlement, deleteSettlement
} from '../../api/auth';

export default function SettlementContent() {
  const now = new Date();
  const [year, setYear]               = useState(now.getFullYear());
  const [month, setMonth]             = useState(now.getMonth() + 1);
  const [platforms, setPlatforms]     = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [showAddModal, setShowAddModal]           = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  // 추가 폼
  const [form, setForm] = useState({
    platformId: '', amount: '', region: '국내', memo: ''
  });

  const load = async () => {
    try {
      const [p, s] = await Promise.all([
        fetchPlatforms(),
        fetchMonthlySettlement(year, month),
      ]);
      setPlatforms(p.data);
      setSettlements(s.data);
    } catch { setError('데이터를 불러오지 못했습니다.'); }
  };

  useEffect(() => { load(); }, [year, month]);

  // 정산 저장
  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.platformId || !form.amount) {
      setError('플랫폼과 금액을 입력해주세요.'); return;
    }
    try {
      await saveSettlement(
        Number(form.platformId), year, month,
        Number(form.amount), form.region, form.memo
      );
      setSuccess('저장되었습니다.');
      setForm({ platformId: '', amount: '', region: '국내', memo: '' });
      setShowAddModal(false);
      load();
    } catch (err) { setError(err.response?.data?.error || '저장 실패'); }
  };

  // 정산 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('이 정산을 삭제할까요?')) return;
    try { await deleteSettlement(id); setSuccess('삭제되었습니다.'); load(); }
    catch { setError('삭제 실패'); }
  };

  // 플랫폼 추가
  const handleAddPlatform = async (e) => {
    e.preventDefault(); setError('');
    if (!newPlatform.trim()) { setError('플랫폼 이름을 입력해주세요.'); return; }
    try {
      await addPlatform(newPlatform.trim());
      setNewPlatform(''); load();
    } catch (err) { setError(err.response?.data?.error || '추가 실패'); }
  };

  // 플랫폼 삭제
  const handleRemovePlatform = async (id, name) => {
    if (!window.confirm(`${name} 플랫폼을 삭제할까요?`)) return;
    try { await removePlatform(id); load(); }
    catch { setError('삭제 실패'); }
  };

  const fmt = (n) => n ? Number(n).toLocaleString() + '원' : '-';
  const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const regionBadge = (r) => ({
    background: r === '국내' ? '#dbeafe' : '#fef3c7',
    color:      r === '국내' ? '#1e40af' : '#92400e',
  });

  return (
    <div>
      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
            {months.map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-outline" onClick={() => setShowPlatformModal(true)}>플랫폼 관리</button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>＋ 정산 추가</button>
        </div>
      </div>

      {error   && <div className="alert alert-error">⚠ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* 정산 테이블 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {['플랫폼', '국내/해외', '금액', '비고', ''].map(h => (
                <th key={h} style={{ padding: '14px 20px', textAlign: h === '금액' ? 'right' : 'left', color: '#888', fontSize: '12px', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 ? (
              <tr><td colSpan={5} className="empty">이 달의 정산 내역이 없습니다.</td></tr>
            ) : settlements.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={{ padding: '14px 20px', fontWeight: 500 }}>{s.platformName}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ ...regionBadge(s.region), fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px' }}>
                    {s.region}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>{fmt(s.amount)}</td>
                <td style={{ padding: '14px 20px', color: '#888', fontSize: '13px' }}>{s.memo || '-'}</td>
                <td style={{ padding: '14px 20px' }}>
                  <button className="delete-btn" onClick={() => handleDelete(s.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
          {settlements.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f8f9fa', borderTop: '2px solid #e0e0e0' }}>
                <td colSpan={2} style={{ padding: '14px 20px', fontWeight: 600 }}>합계</td>
                <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, fontSize: '16px', color: '#1d4ed8' }}>
                  {fmt(totalAmount)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 정산 추가 모달 */}
      {showAddModal && (
        <div className="modal-bg" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">정산 추가</h3>
            <form onSubmit={handleSave} className="modal-form">
              <div className="field">
                <label>플랫폼</label>
                <select value={form.platformId} onChange={e => setForm({...form, platformId: e.target.value})}>
                  <option value="">선택하세요</option>
                  {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>국내 / 해외</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['국내', '해외'].map(r => (
                    <button key={r} type="button"
                      onClick={() => setForm({...form, region: r})}
                      style={{
                        flex: 1, padding: '10px', border: '1.5px solid',
                        borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                        fontWeight: form.region === r ? 600 : 400,
                        background: form.region === r ? (r === '국내' ? '#dbeafe' : '#fef3c7') : '#fff',
                        color:      form.region === r ? (r === '국내' ? '#1e40af' : '#92400e') : '#555',
                        borderColor: form.region === r ? (r === '국내' ? '#93c5fd' : '#fcd34d') : '#e0e0e0',
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>금액</label>
                <input type="number" placeholder="금액 입력 (원)" value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div className="field">
                <label>비고</label>
                <input type="text" placeholder="메모 (선택)" value={form.memo}
                  onChange={e => setForm({...form, memo: e.target.value})} />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>취소</button>
                <button type="submit" className="btn-primary">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 플랫폼 관리 모달 */}
      {showPlatformModal && (
        <div className="modal-bg" onClick={() => setShowPlatformModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">플랫폼 관리</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem', minHeight: '60px' }}>
              {platforms.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9f9f9', borderRadius: '8px', fontSize: '14px' }}>
                  <span>{p.name}</span>
                  <button className="delete-btn" onClick={() => handleRemovePlatform(p.id, p.name)}>삭제</button>
                </div>
              ))}
              {platforms.length === 0 && <p className="empty">등록된 플랫폼이 없습니다.</p>}
            </div>
            <form onSubmit={handleAddPlatform} style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              <input type="text" placeholder="플랫폼 이름 (예: viator)" value={newPlatform}
                onChange={e => setNewPlatform(e.target.value)}
                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              <button type="submit" className="btn-primary">추가</button>
            </form>
            {error && <p className="field-error">⚠ {error}</p>}
            <div className="modal-btns">
              <button className="btn-outline" onClick={() => setShowPlatformModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
