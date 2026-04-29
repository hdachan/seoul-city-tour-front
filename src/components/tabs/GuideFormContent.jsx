import { useEffect, useState } from 'react';
import {
  fetchTourNames,
  fetchGuideRecords, addGuideRecord, deleteGuideRecord,
  fetchGuideExpense, addGuideExpense, deleteGuideExpense,
  fetchGuideDailyFee, addGuideDailyFee, deleteGuideDailyFee,
} from '../../api/auth';
import './GuideFormContent.css';

const TAX_RATE = 0.033;
const today = () => new Date().toISOString().split('T')[0];

export default function GuideFormContent() {
  const now      = new Date();
  const username = sessionStorage.getItem('username');
  const year     = now.getFullYear();
  const month    = now.getMonth() + 1;

  const [tourNames, setTourNames] = useState([]);
  const [records, setRecords]     = useState([]);
  const [expenses, setExpenses]   = useState([]);
  const [dailyFees, setDailyFees] = useState([]);
  const [activeTab, setActiveTab] = useState('records');
  const [showIncomeModal, setShowIncomeModal]     = useState(false);
  const [showExpenseModal, setShowExpenseModal]   = useState(false);
  const [showDailyFeeModal, setShowDailyFeeModal] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const emptyIncome  = { tourName: '', representativeName: '', paymentType: '현금', amount: '', headcount: '' };
  const emptyExpense = { expenseType: '북한관수수료', amount: '', headcount: '', paymentType: '현금' };
  const emptyFee     = { amount: '', date: today() };

  const [incomeForm, setIncomeForm]   = useState(emptyIncome);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [dailyFeeForm, setDailyFeeForm] = useState(emptyFee);

  const previewIncomeTotal  = () => Number(incomeForm.amount  || 0) * Number(incomeForm.headcount  || 0);
  const previewExpenseTotal = () => Number(expenseForm.amount || 0) * Number(expenseForm.headcount || 0);

  const load = async () => {
    try {
      const [t, r, e, d] = await Promise.all([
        fetchTourNames(),
        fetchGuideRecords(year, month),
        fetchGuideExpense(year, month),
        fetchGuideDailyFee(year, month),
      ]);
      setTourNames(t.data);
      setRecords(r.data);
      setExpenses(e.data);
      setDailyFees(d.data);
    } catch { setError('데이터를 불러오지 못했습니다.'); }
  };

  useEffect(() => { load(); }, []);

  // ── 수입 추가 ──
  const handleAddIncome = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!incomeForm.tourName) { setError('투어이름을 선택해주세요.'); return; }
    if ((incomeForm.paymentType === '현금' || incomeForm.paymentType === '카드') && (!incomeForm.amount || !incomeForm.headcount)) {
      setError('금액과 인원을 입력해주세요.'); return;
    }
    try {
      await addGuideRecord({ ...incomeForm });
      setSuccess('수입이 추가되었습니다.');
      setIncomeForm(emptyIncome);
      setShowIncomeModal(false);
      load();
    } catch (err) { setError(err.response?.data?.error || '추가 실패'); }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('삭제할까요?')) return;
    try { await deleteGuideRecord(id); load(); }
    catch (err) { setError(err.response?.data?.error || '삭제 실패'); }
  };

  // ── 지출 추가 ──
  const handleAddExpense = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!expenseForm.amount)    { setError('금액을 입력해주세요.'); return; }
    if (!expenseForm.headcount) { setError('인원을 입력해주세요.'); return; }
    try {
      await addGuideExpense({ ...expenseForm });
      setSuccess('지출이 추가되었습니다.');
      setExpenseForm(emptyExpense);
      setShowExpenseModal(false);
      load();
    } catch (err) { setError(err.response?.data?.error || '추가 실패'); }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('삭제할까요?')) return;
    try { await deleteGuideExpense(id); load(); }
    catch (err) { setError(err.response?.data?.error || '삭제 실패'); }
  };

  // ── 일비 추가 ──
  const handleAddDailyFee = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!dailyFeeForm.amount) { setError('금액을 입력해주세요.'); return; }
    if (!dailyFeeForm.date)   { setError('날짜를 선택해주세요.'); return; }
    try {
      await addGuideDailyFee(Number(dailyFeeForm.amount), dailyFeeForm.date);
      setSuccess('일비가 추가되었습니다.');
      setDailyFeeForm(emptyFee);
      setShowDailyFeeModal(false);
      load();
    } catch (err) { setError(err.response?.data?.error || '추가 실패'); }
  };

  const handleDeleteDailyFee = async (id) => {
    if (!window.confirm('삭제할까요?')) return;
    try { await deleteGuideDailyFee(id); load(); }
    catch (err) { setError(err.response?.data?.error || '삭제 실패'); }
  };

  // ── 계산 ──
  const cashTotal    = records.filter(r => r.paymentType === '현금').reduce((s, r) => s + (r.totalAmount || 0), 0);
  const expCashTotal = expenses.filter(e => e.paymentType === '현금').reduce((s, e) => s + (e.totalAmount || 0), 0);
  const netTotal     = cashTotal - expCashTotal;

  const totalDailyFee  = dailyFees.reduce((s, d) => s + d.amount, 0);
  const taxAmount      = Math.round(totalDailyFee * TAX_RATE);
  const actualDailyFee = totalDailyFee - taxAmount;

  const fmt = (n) => Number(n).toLocaleString() + '원';

  const payBadge = (type) => ({
    '현금': { background: '#d1fae5', color: '#065f46' },
    '카드': { background: '#dbeafe', color: '#1e40af' },
    '그외': { background: '#f3f4f6', color: '#555' },
  }[type] || { background: '#f3f4f6', color: '#555' });

  const expTypeBadge = (type) => type === '북한관수수료'
    ? { background: '#fef3c7', color: '#92400e' }
    : { background: '#ede9fe', color: '#5b21b6' };

  const SelectBtn = ({ options, value, onChange, badgeFn }) => (
    <div style={{ display: 'flex', gap: '8px' }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          style={{
            flex: 1, padding: '9px', border: '1.5px solid', borderRadius: '8px',
            fontSize: '13px', cursor: 'pointer',
            fontWeight: value === opt ? 600 : 400,
            ...(value === opt ? (badgeFn ? badgeFn(opt) : payBadge(opt)) : { background: '#fff', color: '#555', borderColor: '#e0e0e0' })
          }}>
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="gf-wrapper">
      <div className="gf-header">
        <div>
          <h2 className="gf-title">📝 가이드 정산</h2>
          <p className="gf-subtitle">{username} · {year}년 {month}월</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary" onClick={() => setShowIncomeModal(true)}>＋ 수입 추가</button>
          <button className="btn-outline" onClick={() => setShowExpenseModal(true)}>＋ 지출 추가</button>
          <button className="btn-outline" onClick={() => setShowDailyFeeModal(true)}>＋ 일비 추가</button>
        </div>
      </div>

      {error   && <div className="alert alert-error" onClick={() => setError('')}>⚠ {error}</div>}
      {success && <div className="alert alert-success" onClick={() => setSuccess('')}>✅ {success}</div>}

      {/* 요약 */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">현금 수입합계</div>
          <div className="summary-value cash">{fmt(cashTotal)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">지출합계 (현금)</div>
          <div className="summary-value expense">{fmt(expCashTotal)}</div>
        </div>
        <div className={`summary-card ${netTotal >= 0 ? 'positive' : 'negative'}`}>
          <div className="summary-label">토탈 (현금 수입 - 현금 지출)</div>
          <div className={`summary-value ${netTotal >= 0 ? 'plus' : 'minus'}`}>
            {netTotal >= 0 ? '+' : ''}{fmt(netTotal)}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="gf-tab-bar">
        <button className={`gf-tab ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>수입 ({records.length}건)</button>
        <button className={`gf-tab ${activeTab === 'expense' ? 'active' : ''}`} onClick={() => setActiveTab('expense')}>지출 ({expenses.length}건)</button>
        <button className={`gf-tab ${activeTab === 'dailyfee' ? 'active' : ''}`} onClick={() => setActiveTab('dailyfee')}>일비 ({dailyFees.length}건)</button>
      </div>

      {/* 수입 탭 */}
      {activeTab === 'records' && (
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr><th>투어이름</th><th>대표자</th><th>결제</th><th>금액(1인)</th><th>인원</th><th>합계</th><th></th></tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={7} className="empty">수입 내역이 없습니다.</td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td>{r.tourName}</td>
                  <td>{r.representativeName || '-'}</td>
                  <td><span className="pay-badge" style={payBadge(r.paymentType)}>{r.paymentType}</span></td>
                  <td className="td-right">{r.amount ? fmt(r.amount) : '-'}</td>
                  <td className="td-center">{r.headcount ? `${r.headcount}명` : '-'}</td>
                  <td className="td-right total-cell">{r.totalAmount ? fmt(r.totalAmount) : '-'}</td>
                  <td><button className="delete-btn" onClick={() => handleDeleteRecord(r.id)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 지출 탭 */}
      {activeTab === 'expense' && (
        <div className="gf-table-wrap">
          <table className="gf-table">
            <thead>
              <tr><th>항목</th><th>결제</th><th>금액(1인)</th><th>인원</th><th>합계</th><th></th></tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="empty">지출 내역이 없습니다.</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id}>
                  <td><span className="pay-badge" style={expTypeBadge(e.expenseType)}>{e.expenseType}</span></td>
                  <td><span className="pay-badge" style={payBadge(e.paymentType)}>{e.paymentType}</span></td>
                  <td className="td-right">{fmt(e.amount)}</td>
                  <td className="td-center">{e.headcount ? `${e.headcount}명` : '-'}</td>
                  <td className="td-right total-cell">{e.totalAmount ? fmt(e.totalAmount) : '-'}</td>
                  <td><button className="delete-btn" onClick={() => handleDeleteExpense(e.id)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 일비 탭 */}
      {activeTab === 'dailyfee' && (
        <div>
          {totalDailyFee > 0 && (
            <div className="daily-fee-card">
              <div className="daily-fee-title">💰 가이드 일비 정산 (3.3% 원천징수)</div>
              <div className="daily-fee-grid">
                <div><div className="daily-label">총 일비</div><div className="daily-value">{fmt(totalDailyFee)}</div></div>
                <div><div className="daily-label">신고액 (3.3%)</div><div className="daily-value tax">- {fmt(taxAmount)}</div></div>
                <div><div className="daily-label">실수령 투어비용</div><div className="daily-value actual">{fmt(actualDailyFee)}</div></div>
              </div>
            </div>
          )}
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead><tr><th>날짜</th><th>일비 금액</th><th></th></tr></thead>
              <tbody>
                {dailyFees.length === 0 ? (
                  <tr><td colSpan={3} className="empty">일비 내역이 없습니다.</td></tr>
                ) : dailyFees.map(d => (
                  <tr key={d.id}>
                    <td>{d.date}</td>
                    <td className="td-right" style={{ fontWeight: 600, color: '#1d4ed8' }}>{fmt(d.amount)}</td>
                    <td><button className="delete-btn" onClick={() => handleDeleteDailyFee(d.id)}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 수입 추가 모달 */}
      {showIncomeModal && (
        <div className="modal-bg" onClick={() => setShowIncomeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">수입 추가</h3>
            <form onSubmit={handleAddIncome} className="modal-form">
              <div className="field">
                <label>투어이름 *</label>
                <select value={incomeForm.tourName} onChange={e => setIncomeForm({...incomeForm, tourName: e.target.value})}>
                  <option value="">선택하세요</option>
                  {tourNames.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>대표자이름</label>
                <input type="text" placeholder="대표자 이름" value={incomeForm.representativeName}
                  onChange={e => setIncomeForm({...incomeForm, representativeName: e.target.value})} />
              </div>
              <div className="field">
                <label>결제유형 *</label>
                <SelectBtn options={['현금','카드','그외']} value={incomeForm.paymentType}
                  onChange={v => setIncomeForm({...incomeForm, paymentType: v, amount: '', headcount: ''})} />
              </div>
              {(incomeForm.paymentType === '현금' || incomeForm.paymentType === '카드') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="field">
                      <label>금액 (1인)</label>
                      <input type="number" placeholder="금액" value={incomeForm.amount}
                        onChange={e => setIncomeForm({...incomeForm, amount: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>인원</label>
                      <input type="number" placeholder="명" value={incomeForm.headcount}
                        onChange={e => setIncomeForm({...incomeForm, headcount: e.target.value})} />
                    </div>
                  </div>
                  {incomeForm.amount && incomeForm.headcount && (
                    <div className="total-preview">
                      합계: <strong>{fmt(previewIncomeTotal())}</strong>
                      <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                        ({Number(incomeForm.amount).toLocaleString()} × {incomeForm.headcount}명)
                      </span>
                    </div>
                  )}
                </>
              )}
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setShowIncomeModal(false)}>취소</button>
                <button type="submit" className="btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 지출 추가 모달 */}
      {showExpenseModal && (
        <div className="modal-bg" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">지출 추가</h3>
            <form onSubmit={handleAddExpense} className="modal-form">
              <div className="field">
                <label>항목 *</label>
                <SelectBtn options={['북한관수수료','가이드입장료']} value={expenseForm.expenseType}
                  onChange={v => setExpenseForm({...expenseForm, expenseType: v})} badgeFn={expTypeBadge} />
              </div>
              <div className="field">
                <label>결제유형 *</label>
                <SelectBtn options={['현금','카드']} value={expenseForm.paymentType}
                  onChange={v => setExpenseForm({...expenseForm, paymentType: v})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="field">
                  <label>금액 (1인) *</label>
                  <input type="number" placeholder="금액" value={expenseForm.amount}
                    onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                </div>
                <div className="field">
                  <label>인원 *</label>
                  <input type="number" placeholder="명" value={expenseForm.headcount}
                    onChange={e => setExpenseForm({...expenseForm, headcount: e.target.value})} />
                </div>
              </div>
              {expenseForm.amount && expenseForm.headcount && (
                <div className="total-preview">
                  합계: <strong>{fmt(previewExpenseTotal())}</strong>
                  <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                    ({Number(expenseForm.amount).toLocaleString()} × {expenseForm.headcount}명)
                  </span>
                </div>
              )}
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setShowExpenseModal(false)}>취소</button>
                <button type="submit" className="btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일비 추가 모달 */}
      {showDailyFeeModal && (
        <div className="modal-bg" onClick={() => setShowDailyFeeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">일비 추가</h3>
            <form onSubmit={handleAddDailyFee} className="modal-form">
              <div className="field">
                <label>날짜 *</label>
                <input type="date" value={dailyFeeForm.date}
                  onChange={e => setDailyFeeForm({...dailyFeeForm, date: e.target.value})} />
              </div>
              <div className="field">
                <label>일비 금액 *</label>
                <input type="number" placeholder="금액 입력" value={dailyFeeForm.amount}
                  onChange={e => setDailyFeeForm({...dailyFeeForm, amount: e.target.value})} />
              </div>
              {dailyFeeForm.amount && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>신고액 (3.3%)</span>
                    <span style={{ color: '#e53e3e', fontWeight: 600 }}>
                      - {Math.round(Number(dailyFeeForm.amount) * TAX_RATE).toLocaleString()}원
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>실수령액</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>
                      {(Number(dailyFeeForm.amount) - Math.round(Number(dailyFeeForm.amount) * TAX_RATE)).toLocaleString()}원
                    </span>
                  </div>
                </div>
              )}
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setShowDailyFeeModal(false)}>취소</button>
                <button type="submit" className="btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
