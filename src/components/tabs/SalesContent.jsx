import { useEffect, useState } from 'react';
import {
  fetchSalesLockStatus,
  fetchSalesReceipts, addSalesReceipt, updateSalesReceipt, deleteSalesReceipt,
  fetchSalesDriving,  addSalesDriving,  updateSalesDriving,  deleteSalesDriving,
} from '../../api/auth';
import './GuideFormContent.css';

export default function SalesContent() {
  const now      = new Date();
  const username = sessionStorage.getItem('username');
  const year     = now.getFullYear();
  const month    = now.getMonth() + 1;

  // 이번 달 날짜 범위
  const minDate  = `${year}-${String(month).padStart(2, '0')}-01`;
  const maxDate  = new Date(year, month, 0).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [isLocked, setIsLocked]   = useState(false);
  const [receipts, setReceipts]   = useState([]);
  const [drivings, setDrivings]   = useState([]);
  const [activeTab, setActiveTab] = useState('receipt');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [receiptModal, setReceiptModal] = useState({ mode: null, data: null });
  const [drivingModal, setDrivingModal] = useState({ mode: null, data: null });

  const emptyReceipt = { date: todayStr, content: '', totalAmount: '', supplyAmount: '', businessNumber: '', companyName: '' };
  const emptyDriving = { date: todayStr, totalFuelDetail: '', averageDistance: '', totalFuelCost: '' };

  const [receiptForm, setReceiptForm] = useState(emptyReceipt);
  const [drivingForm, setDrivingForm] = useState(emptyDriving);

  const load = async () => {
    try {
      const [lock, r, d] = await Promise.all([
        fetchSalesLockStatus(), fetchSalesReceipts(), fetchSalesDriving(),
      ]);
      setIsLocked(lock.data.locked);
      setReceipts(r.data);
      setDrivings(d.data);
    } catch { setError('데이터를 불러오지 못했습니다.'); }
  };

  useEffect(() => { load(); }, []);

  const checkLocked = () => {
    if (isLocked) { setError('이번 달은 관리자에 의해 잠겨있습니다.'); return true; }
    return false;
  };

  // ── 수취금액 ──
  const openReceiptAdd  = () => { setError(''); setReceiptForm(emptyReceipt); setReceiptModal({ mode: 'add' }); };
  const openReceiptEdit = (row) => {
    setError('');
    setReceiptForm({ date: row.date, content: row.content, totalAmount: row.totalAmount, supplyAmount: row.supplyAmount, businessNumber: row.businessNumber, companyName: row.companyName });
    setReceiptModal({ mode: 'edit', data: row });
  };
  const handleSubmitReceipt = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (checkLocked()) return;
    if (!receiptForm.date) { setError('날짜를 선택해주세요.'); return; }
    try {
      if (receiptModal.mode === 'add') { await addSalesReceipt({ ...receiptForm }); setSuccess('추가되었습니다.'); }
      else { await updateSalesReceipt(receiptModal.data.id, { ...receiptForm }); setSuccess('수정되었습니다.'); }
      setReceiptModal({ mode: null }); load();
    } catch (err) { setError(err.response?.data?.error || '처리 실패'); }
  };
  const handleDeleteReceipt = async (id) => {
    if (checkLocked()) return;
    if (!window.confirm('삭제할까요?')) return;
    try { await deleteSalesReceipt(id); load(); }
    catch (err) { setError(err.response?.data?.error || '삭제 실패'); }
  };

  // ── 운행내역 ──
  const openDrivingAdd  = () => { setError(''); setDrivingForm(emptyDriving); setDrivingModal({ mode: 'add' }); };
  const openDrivingEdit = (row) => {
    setError('');
    setDrivingForm({ date: row.date || todayStr, totalFuelDetail: row.totalFuelDetail, averageDistance: row.averageDistance, totalFuelCost: row.totalFuelCost });
    setDrivingModal({ mode: 'edit', data: row });
  };
  const handleSubmitDriving = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (checkLocked()) return;
    if (!drivingForm.date) { setError('날짜를 선택해주세요.'); return; }
    try {
      if (drivingModal.mode === 'add') { await addSalesDriving({ ...drivingForm }); setSuccess('추가되었습니다.'); }
      else { await updateSalesDriving(drivingModal.data.id, { ...drivingForm }); setSuccess('수정되었습니다.'); }
      setDrivingModal({ mode: null }); load();
    } catch (err) { setError(err.response?.data?.error || '처리 실패'); }
  };
  const handleDeleteDriving = async (id) => {
    if (checkLocked()) return;
    if (!window.confirm('삭제할까요?')) return;
    try { await deleteSalesDriving(id); load(); }
    catch (err) { setError(err.response?.data?.error || '삭제 실패'); }
  };

  const fmt = (n) => Number(n).toLocaleString() + '원';

  const ActionBtns = ({ onEdit, onDelete }) => (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button onClick={onEdit}   style={editBtnStyle}>수정</button>
      <button onClick={onDelete} className="delete-btn">삭제</button>
    </div>
  );

  const DateField = ({ value, onChange }) => (
    <div className="field">
      <label>날짜 * ({month}월만 선택 가능)</label>
      <input type="date" min={minDate} max={maxDate} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );

  return (
    <div className="gf-wrapper">
      <div className="gf-header">
        <div>
          <h2 className="gf-title">💼 영업 정산</h2>
          <p className="gf-subtitle">{username} · {year}년 {month}월</p>
        </div>
        {!isLocked && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab === 'receipt' && <button className="btn-primary" onClick={openReceiptAdd}>＋ 수취금액 추가</button>}
            {activeTab === 'driving' && <button className="btn-primary" onClick={openDrivingAdd}>＋ 운행내역 추가</button>}
          </div>
        )}
      </div>

      {isLocked && (
        <div style={{ background: '#fff0f0', border: '1px solid #fed7d7', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', fontSize: '14px', color: '#e53e3e', fontWeight: 500 }}>
          🔒 이번 달은 관리자에 의해 잠겨있습니다.
        </div>
      )}

      {error   && <div className="alert alert-error"   onClick={() => setError('')}>⚠ {error}</div>}
      {success && <div className="alert alert-success" onClick={() => setSuccess('')}>✅ {success}</div>}

      <div className="gf-tab-bar">
        <button className={`gf-tab ${activeTab === 'receipt' ? 'active' : ''}`} onClick={() => setActiveTab('receipt')}>
          수취금액 합계표 ({receipts.length}건)
        </button>
        <button className={`gf-tab ${activeTab === 'driving' ? 'active' : ''}`} onClick={() => setActiveTab('driving')}>
          운행내역 ({drivings.length}건)
        </button>
      </div>

      {/* 수취금액 탭 */}
      {activeTab === 'receipt' && (
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr><th>날짜</th><th>내용</th><th>총금액</th><th>공급가액</th><th>사업자번호</th><th>상호</th>{!isLocked && <th></th>}</tr>
            </thead>
            <tbody>
              {receipts.length === 0
                ? <tr><td colSpan={7} className="empty">수취금액 내역이 없습니다.</td></tr>
                : receipts.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '12px', color: '#888' }}>{r.date}</td>
                    <td>{r.content || '-'}</td>
                    <td className="td-right total-cell">{r.totalAmount ? fmt(r.totalAmount) : '-'}</td>
                    <td className="td-right">{r.supplyAmount ? fmt(r.supplyAmount) : '-'}</td>
                    <td>{r.businessNumber || '-'}</td>
                    <td>{r.companyName || '-'}</td>
                    {!isLocked && <td><ActionBtns onEdit={() => openReceiptEdit(r)} onDelete={() => handleDeleteReceipt(r.id)} /></td>}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* 운행내역 탭 */}
      {activeTab === 'driving' && (
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr><th>날짜</th><th>총주유내역</th><th>평균거리</th><th>총주유금액</th>{!isLocked && <th></th>}</tr>
            </thead>
            <tbody>
              {drivings.length === 0
                ? <tr><td colSpan={5} className="empty">운행내역이 없습니다.</td></tr>
                : drivings.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontSize: '12px', color: '#888' }}>{d.date || '-'}</td>
                    <td>{d.totalFuelDetail || '-'}</td>
                    <td className="td-center">{d.averageDistance ? `${d.averageDistance}km` : '-'}</td>
                    <td className="td-right total-cell">{d.totalFuelCost ? fmt(d.totalFuelCost) : '-'}</td>
                    {!isLocked && <td><ActionBtns onEdit={() => openDrivingEdit(d)} onDelete={() => handleDeleteDriving(d.id)} /></td>}
                  </tr>
                ))
              }
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
              <div className="field">
                <label>내용</label>
                <input type="text" placeholder="내용 입력" value={receiptForm.content}
                  onChange={e => setReceiptForm({...receiptForm, content: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="field">
                  <label>총금액</label>
                  <input type="number" placeholder="금액" value={receiptForm.totalAmount}
                    onChange={e => setReceiptForm({...receiptForm, totalAmount: e.target.value})} />
                </div>
                <div className="field">
                  <label>공급가액</label>
                  <input type="number" placeholder="금액" value={receiptForm.supplyAmount}
                    onChange={e => setReceiptForm({...receiptForm, supplyAmount: e.target.value})} />
                </div>
              </div>
              <div className="field">
                <label>사업자등록번호</label>
                <input type="text" placeholder="000-00-00000" value={receiptForm.businessNumber}
                  onChange={e => setReceiptForm({...receiptForm, businessNumber: e.target.value})} />
              </div>
              <div className="field">
                <label>상호</label>
                <input type="text" placeholder="상호명" value={receiptForm.companyName}
                  onChange={e => setReceiptForm({...receiptForm, companyName: e.target.value})} />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setReceiptModal({ mode: null })}>취소</button>
                <button type="submit" className="btn-primary">{receiptModal.mode === 'add' ? '추가' : '수정'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 운행내역 모달 */}
      {drivingModal.mode && (
        <div className="modal-bg" onClick={() => setDrivingModal({ mode: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">운행내역 {drivingModal.mode === 'add' ? '추가' : '수정'}</h3>
            <form onSubmit={handleSubmitDriving} className="modal-form">
              <DateField value={drivingForm.date} onChange={v => setDrivingForm({...drivingForm, date: v})} />
              <div className="field">
                <label>총주유내역</label>
                <input type="text" placeholder="주유 내역 입력" value={drivingForm.totalFuelDetail}
                  onChange={e => setDrivingForm({...drivingForm, totalFuelDetail: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="field">
                  <label>평균거리 (km)</label>
                  <input type="number" step="0.1" placeholder="km" value={drivingForm.averageDistance}
                    onChange={e => setDrivingForm({...drivingForm, averageDistance: e.target.value})} />
                </div>
                <div className="field">
                  <label>총주유금액</label>
                  <input type="number" placeholder="금액" value={drivingForm.totalFuelCost}
                    onChange={e => setDrivingForm({...drivingForm, totalFuelCost: e.target.value})} />
                </div>
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

const editBtnStyle = { padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' };
