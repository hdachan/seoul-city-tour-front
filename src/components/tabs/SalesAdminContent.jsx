import { useEffect, useState } from 'react';
import {
  fetchSalesUserList, fetchSalesAdminSummary,
  fetchSalesAdminLockStatus, toggleSalesMonthLock,
  fetchAdminReceipts, addAdminReceipt, updateAdminReceipt, deleteAdminReceipt,
  fetchAdminDriving, addAdminDriving, updateAdminDriving, deleteAdminDriving,
} from '../../api/auth';
import './GuideFormContent.css';

export default function SalesAdminContent() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [users, setUsers]               = useState([]);
  const [summary, setSummary]           = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLocked, setIsLocked]         = useState(false);
  const [receipts, setReceipts]         = useState([]);
  const [drivings, setDrivings]         = useState([]);
  const [activeTab, setActiveTab]       = useState('receipt');
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [receiptModal, setReceiptModal] = useState({ mode: null, data: null });
  const [drivingModal, setDrivingModal] = useState({ mode: null, data: null });
  const [receiptForm, setReceiptForm]   = useState({});
  const [drivingForm, setDrivingForm]   = useState({});

  const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 선택된 년월의 첫날 ~ 마지막날
  const minDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const maxDate = new Date(year, month, 0).toISOString().split('T')[0];
  const defaultDate = () => {
    // 현재 달이면 오늘, 아니면 그 달 1일
    const todayYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selYM   = `${year}-${String(month).padStart(2, '0')}`;
    return todayYM === selYM ? now.toISOString().split('T')[0] : minDate;
  };

  useEffect(() => {
    fetchSalesUserList().then(res => setUsers(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (users.length === 0) return;
    fetchSalesAdminSummary(year, month).then(res => setSummary(res.data)).catch(() => {});
  }, [users, year, month]);

  useEffect(() => {
    if (!selectedUser) return;
    loadDetail();
  }, [selectedUser, year, month]);

  const loadDetail = async () => {
    try {
      const [lock, r, d] = await Promise.all([
        fetchSalesAdminLockStatus(selectedUser.username, year, month),
        fetchAdminReceipts(selectedUser.username, year, month),
        fetchAdminDriving(selectedUser.username, year, month),
      ]);
      setIsLocked(lock.data.locked);
      setReceipts(r.data);
      setDrivings(d.data);
    } catch { setError('데이터를 불러오지 못했습니다.'); }
  };

  const reloadSummary = () =>
    fetchSalesAdminSummary(year, month).then(res => setSummary(res.data)).catch(() => {});

  const handleToggleLock = async (user, currentLocked) => {
    const newLocked = !currentLocked;
    try {
      await toggleSalesMonthLock(user.username, year, month, newLocked);
      if (selectedUser?.username === user.username) setIsLocked(newLocked);
      setSuccess(newLocked ? `🔒 ${user.name} ${month}월 완료!` : `🔓 ${user.name} ${month}월 잠금 해제`);
      reloadSummary();
    } catch { setError('변경 실패'); }
  };

  // ── 수취금액 ──
  const openReceiptAdd  = () => { setError(''); setReceiptForm({ date: defaultDate(), content: '', totalAmount: '', supplyAmount: '', businessNumber: '', companyName: '' }); setReceiptModal({ mode: 'add' }); };
  const openReceiptEdit = (row) => { setError(''); setReceiptForm({ date: row.date, content: row.content, totalAmount: row.totalAmount, supplyAmount: row.supplyAmount, businessNumber: row.businessNumber, companyName: row.companyName }); setReceiptModal({ mode: 'edit', data: row }); };
  const handleSubmitReceipt = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (receiptModal.mode === 'add') { await addAdminReceipt({ ...receiptForm, salesUsername: selectedUser.username }); setSuccess('추가되었습니다.'); }
      else { await updateAdminReceipt(receiptModal.data.id, receiptForm); setSuccess('수정되었습니다.'); }
      setReceiptModal({ mode: null }); loadDetail(); reloadSummary();
    } catch (err) { setError(err.response?.data?.error || '처리 실패'); }
  };
  const handleDeleteReceipt = async (id) => {
    if (!window.confirm('삭제할까요?')) return;
    try { await deleteAdminReceipt(id); loadDetail(); reloadSummary(); }
    catch { setError('삭제 실패'); }
  };

  // ── 운행내역 ──
  const openDrivingAdd  = () => { setError(''); setDrivingForm({ date: defaultDate(), totalFuelDetail: '', averageDistance: '', totalFuelCost: '' }); setDrivingModal({ mode: 'add' }); };
  const openDrivingEdit = (row) => { setError(''); setDrivingForm({ date: row.date || defaultDate(), totalFuelDetail: row.totalFuelDetail, averageDistance: row.averageDistance, totalFuelCost: row.totalFuelCost }); setDrivingModal({ mode: 'edit', data: row }); };
  const handleSubmitDriving = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (drivingModal.mode === 'add') { await addAdminDriving({ ...drivingForm, salesUsername: selectedUser.username }); setSuccess('추가되었습니다.'); }
      else { await updateAdminDriving(drivingModal.data.id, drivingForm); setSuccess('수정되었습니다.'); }
      setDrivingModal({ mode: null }); loadDetail(); reloadSummary();
    } catch (err) { setError(err.response?.data?.error || '처리 실패'); }
  };
  const handleDeleteDriving = async (id) => {
    if (!window.confirm('삭제할까요?')) return;
    try { await deleteAdminDriving(id); loadDetail(); reloadSummary(); }
    catch { setError('삭제 실패'); }
  };

  const fmt = (n) => Number(n).toLocaleString() + '원';

  // 관리자는 선택된 년월 범위로 날짜 제한
  const DateField = ({ value, onChange }) => (
    <div className="field">
      <label>날짜 * ({year}년 {month}월)</label>
      <input type="date" min={minDate} max={maxDate} value={value || defaultDate()}
        onChange={e => onChange(e.target.value)} />
    </div>
  );

  const FilterBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', background: '#fff', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      {selectedUser && (
        <button onClick={() => setSelectedUser(null)} style={{ padding: '7px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#555' }}>← 목록</button>
      )}
      <select value={year} onChange={e => setYear(Number(e.target.value))} style={selStyle}>
        {years.map(y => <option key={y} value={y}>{y}년</option>)}
      </select>
      <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selStyle}>
        {months.map(m => <option key={m} value={m}>{m}월</option>)}
      </select>
      {selectedUser && <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginLeft: '4px' }}>{selectedUser.name}</span>}
      {selectedUser && (
        <button onClick={() => handleToggleLock(selectedUser, isLocked)} style={{ marginLeft: 'auto', padding: '8px 16px', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, background: isLocked ? '#d1fae5' : '#f3f4f6', color: isLocked ? '#065f46' : '#888' }}>
          {isLocked ? '✅ 정산 완료' : '⏳ 진행중'}
        </button>
      )}
    </div>
  );

  // ── 카드 뷰 ──
  if (!selectedUser) {
    return (
      <div>
        <FilterBar />
        {error   && <div className="alert alert-error"   onClick={() => setError('')}>⚠ {error}</div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '14px' }}>
          {summary.map(u => (
            <div key={u.username} style={{ background: '#fff', borderRadius: '14px', padding: '1.4rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: `2px solid ${u.locked ? '#c6f6d5' : u.hasData ? '#bfdbfe' : '#f0f0f0'}`, transition: 'all 0.15s', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div onClick={() => setSelectedUser({ username: u.username, name: u.name })}>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>{u.name}</div>
                {u.hasData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                    <CountRow label="수취금액" count={u.receiptCount} color="#059669" />
                    <CountRow label="운행내역"  count={u.drivingCount} color="#1d4ed8" />
                  </div>
                ) : (
                  <div style={{ marginBottom: '14px', padding: '10px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                    ✏️ 아직 입력 없음
                  </div>
                )}
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleToggleLock(u, u.locked); }}
                style={{ width: '100%', padding: '9px', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, background: u.locked ? '#d1fae5' : '#f3f4f6', color: u.locked ? '#065f46' : '#888' }}>
                {u.locked ? '✅ 정산 완료' : '⏳ 진행중'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 상세 뷰 ──
  return (
    <div>
      <FilterBar />
      {error   && <div className="alert alert-error"   onClick={() => setError('')}>⚠ {error}</div>}
      {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', padding: '10px 16px', background: isLocked ? '#f0fff4' : '#fffbeb', border: `1px solid ${isLocked ? '#c6f6d5' : '#fde68a'}`, borderRadius: '8px', fontSize: '13px' }}>
        <span style={{ fontWeight: 600, color: isLocked ? '#276749' : '#92400e' }}>
          {isLocked ? '✅ 정산 완료된 달입니다.' : '⏳ 정산 진행 중입니다.'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="gf-tab-bar" style={{ marginBottom: 0, flex: 1 }}>
          <button className={`gf-tab ${activeTab === 'receipt' ? 'active' : ''}`} onClick={() => setActiveTab('receipt')}>수취금액 합계표 ({receipts.length}건)</button>
          <button className={`gf-tab ${activeTab === 'driving' ? 'active' : ''}`} onClick={() => setActiveTab('driving')}>운행내역 ({drivings.length}건)</button>
        </div>
        <div style={{ paddingLeft: '12px' }}>
          {activeTab === 'receipt' && <button className="btn-primary" onClick={openReceiptAdd}>＋ 추가</button>}
          {activeTab === 'driving' && <button className="btn-primary" onClick={openDrivingAdd}>＋ 추가</button>}
        </div>
      </div>

      {/* 수취금액 탭 */}
      {activeTab === 'receipt' && (
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead><tr><th>날짜</th><th>내용</th><th>총금액</th><th>공급가액</th><th>사업자번호</th><th>상호</th><th></th></tr></thead>
            <tbody>
              {receipts.length === 0 ? <tr><td colSpan={7} className="empty">내역이 없습니다.</td></tr>
              : receipts.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: '12px', color: '#888' }}>{r.date}</td>
                  <td>{r.content || '-'}</td>
                  <td className="td-right total-cell">{r.totalAmount ? fmt(r.totalAmount) : '-'}</td>
                  <td className="td-right">{r.supplyAmount ? fmt(r.supplyAmount) : '-'}</td>
                  <td>{r.businessNumber || '-'}</td>
                  <td>{r.companyName || '-'}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => openReceiptEdit(r)} style={editBtnStyle}>수정</button>
                    <button onClick={() => handleDeleteReceipt(r.id)} className="delete-btn">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 운행내역 탭 */}
      {activeTab === 'driving' && (
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead><tr><th>날짜</th><th>총주유내역</th><th>평균거리</th><th>총주유금액</th><th></th></tr></thead>
            <tbody>
              {drivings.length === 0 ? <tr><td colSpan={5} className="empty">내역이 없습니다.</td></tr>
              : drivings.map(d => (
                <tr key={d.id}>
                  <td style={{ fontSize: '12px', color: '#888' }}>{d.date || '-'}</td>
                  <td>{d.totalFuelDetail || '-'}</td>
                  <td className="td-center">{d.averageDistance ? `${d.averageDistance}km` : '-'}</td>
                  <td className="td-right total-cell">{d.totalFuelCost ? fmt(d.totalFuelCost) : '-'}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => openDrivingEdit(d)} style={editBtnStyle}>수정</button>
                    <button onClick={() => handleDeleteDriving(d.id)} className="delete-btn">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 수취금액 모달 */}
      {receiptModal.mode && (
        <div className="modal-bg" onClick={() => setReceiptModal({ mode: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">수취금액 {receiptModal.mode === 'add' ? '추가' : '수정'}</h3>
            <form onSubmit={handleSubmitReceipt} className="modal-form">
              <DateField value={receiptForm.date} onChange={v => setReceiptForm({...receiptForm, date: v})} />
              <div className="field"><label>내용</label><input type="text" value={receiptForm.content || ''} onChange={e => setReceiptForm({...receiptForm, content: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="field"><label>총금액</label><input type="number" value={receiptForm.totalAmount || ''} onChange={e => setReceiptForm({...receiptForm, totalAmount: e.target.value})} /></div>
                <div className="field"><label>공급가액</label><input type="number" value={receiptForm.supplyAmount || ''} onChange={e => setReceiptForm({...receiptForm, supplyAmount: e.target.value})} /></div>
              </div>
              <div className="field"><label>사업자등록번호</label><input type="text" value={receiptForm.businessNumber || ''} onChange={e => setReceiptForm({...receiptForm, businessNumber: e.target.value})} /></div>
              <div className="field"><label>상호</label><input type="text" value={receiptForm.companyName || ''} onChange={e => setReceiptForm({...receiptForm, companyName: e.target.value})} /></div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setReceiptModal({ mode: null })}>취소</button>
                <button type="submit" className="btn-primary">{receiptModal.mode === 'add' ? '추가' : '수정'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 운행내역 모달 (운행월 없음, 날짜만) */}
      {drivingModal.mode && (
        <div className="modal-bg" onClick={() => setDrivingModal({ mode: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">운행내역 {drivingModal.mode === 'add' ? '추가' : '수정'}</h3>
            <form onSubmit={handleSubmitDriving} className="modal-form">
              <DateField value={drivingForm.date} onChange={v => setDrivingForm({...drivingForm, date: v})} />
              <div className="field"><label>총주유내역</label><input type="text" value={drivingForm.totalFuelDetail || ''} onChange={e => setDrivingForm({...drivingForm, totalFuelDetail: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="field"><label>평균거리 (km)</label><input type="number" step="0.1" value={drivingForm.averageDistance || ''} onChange={e => setDrivingForm({...drivingForm, averageDistance: e.target.value})} /></div>
                <div className="field"><label>총주유금액</label><input type="number" value={drivingForm.totalFuelCost || ''} onChange={e => setDrivingForm({...drivingForm, totalFuelCost: e.target.value})} /></div>
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setDrivingModal({ mode: null })}>취소</button>
                <button type="submit" className="btn-primary">{drivingModal.mode === 'add' ? '추가' : '수정'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CountRow({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: 600, color: count > 0 ? color : '#ccc' }}>{count > 0 ? `${count}건` : '미입력'}</span>
    </div>
  );
}

const selStyle     = { padding: '8px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' };
const editBtnStyle = { padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' };
