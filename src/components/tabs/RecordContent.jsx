import { useEffect, useState } from 'react';
import {
  fetchRecords, addRecord, removeRecord,
  fetchCategories, addCategory, removeCategory
} from '../../api/auth';

export default function RecordContent() {
  const [records, setRecords]           = useState([]);
  const [cat1List, setCat1List]         = useState([]);
  const [cat2List, setCat2List]         = useState([]);
  const [showModal, setShowModal]       = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catType, setCatType]           = useState(1);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [form, setForm] = useState({ date: '', category1Id: '', category2Id: '', count: 1, memo: '' });
  const [catForm, setCatForm] = useState({ name: '', price: '' });

  const calcTotal = () => {
    const cat1 = cat1List.find(c => String(c.id) === String(form.category1Id));
    const cat2 = cat2List.find(c => String(c.id) === String(form.category2Id));
    if (!cat1 || !cat2 || !form.count) return 0;
    return (cat1.price + cat2.price) * form.count;
  };

  const load = async () => {
    try {
      const [r, c1, c2] = await Promise.all([fetchRecords(), fetchCategories(1), fetchCategories(2)]);
      setRecords(r.data); setCat1List(c1.data); setCat2List(c2.data);
    } catch { setError('데이터를 불러오지 못했습니다.'); }
  };

  useEffect(() => { load(); }, []);

  const handleAddRecord = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!form.date || !form.category1Id || !form.category2Id || !form.count) {
      setError('날짜, 내역1, 내역2, 대수를 모두 입력해주세요.'); return;
    }
    try {
      await addRecord({ ...form, count: Number(form.count) });
      setSuccess('기록이 추가되었습니다.');
      setForm({ date: '', category1Id: '', category2Id: '', count: 1, memo: '' });
      setShowModal(false); load();
    } catch (err) { setError(err.response?.data?.error || '추가 실패'); }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('이 기록을 삭제할까요?')) return;
    try { await removeRecord(id); setSuccess('삭제되었습니다.'); load(); }
    catch { setError('삭제 실패'); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault(); setError('');
    if (!catForm.name || !catForm.price) { setError('이름과 가격을 입력해주세요.'); return; }
    try {
      await addCategory(catType, catForm.name, Number(catForm.price));
      setCatForm({ name: '', price: '' }); load();
    } catch (err) { setError(err.response?.data?.error || '카테고리 추가 실패'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('삭제할까요?')) return;
    try { await removeCategory(id); load(); }
    catch { setError('삭제 실패'); }
  };

  const fmt = (n) => Number(n).toLocaleString() + '원';

  return (
    <div>
      {/* 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '1rem' }}>
        <button className="btn-outline" onClick={() => { setCatType(1); setShowCatModal(true); }}>내역 카테고리 관리</button>
        <button className="btn-primary" onClick={() => setShowModal(true)}>＋ 기록 추가</button>
      </div>

      {error   && <div className="alert alert-error">⚠ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      {/* 테이블 */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
          <thead>
            <tr>
              {['날짜','내역1','내역2','대수','내역1 가격','내역2 가격','토탈','비고',''].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', color: '#888', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={9} className="empty">등록된 기록이 없습니다.</td></tr>
            ) : records.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                <td style={{ padding: '12px 14px' }}>{r.date}</td>
                <td style={{ padding: '12px 14px' }}>{r.category1?.name || '-'}</td>
                <td style={{ padding: '12px 14px' }}>{r.category2?.name || '-'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>{r.count}대</td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>{r.category1?.price ? fmt(r.category1.price) : '-'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>{r.category2?.price ? fmt(r.category2.price) : '-'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>{fmt(r.total)}</td>
                <td style={{ padding: '12px 14px', color: '#888', fontSize: '12px' }}>{r.memo || '-'}</td>
                <td style={{ padding: '12px 14px' }}><button className="delete-btn" onClick={() => handleDeleteRecord(r.id)}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 기록 추가 모달 */}
      {showModal && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">운행 기록 추가</h3>
            <form onSubmit={handleAddRecord} className="modal-form">
              <div className="field"><label>날짜</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="field"><label>내역1</label>
                <select value={form.category1Id} onChange={e => setForm({...form, category1Id: e.target.value})}>
                  <option value="">선택하세요</option>
                  {cat1List.map(c => <option key={c.id} value={c.id}>{c.name} ({c.price.toLocaleString()}원)</option>)}
                </select>
              </div>
              <div className="field"><label>내역2</label>
                <select value={form.category2Id} onChange={e => setForm({...form, category2Id: e.target.value})}>
                  <option value="">선택하세요</option>
                  {cat2List.map(c => <option key={c.id} value={c.id}>{c.name} ({c.price.toLocaleString()}원)</option>)}
                </select>
              </div>
              <div className="field"><label>대수</label>
                <input type="number" min="1" value={form.count} onChange={e => setForm({...form, count: e.target.value})} />
              </div>
              {form.category1Id && form.category2Id && form.count > 0 && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#1e40af' }}>
                  예상 토탈: <strong style={{ fontSize: '16px' }}>{fmt(calcTotal())}</strong>
                </div>
              )}
              <div className="field"><label>비고</label>
                <input type="text" placeholder="메모 (선택)" value={form.memo} onChange={e => setForm({...form, memo: e.target.value})} />
              </div>
              {error && <p className="field-error">⚠ {error}</p>}
              <div className="modal-btns">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>취소</button>
                <button type="submit" className="btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 카테고리 모달 */}
      {showCatModal && (
        <div className="modal-bg" onClick={() => setShowCatModal(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">카테고리 관리</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              {[1,2].map(t => (
                <button key={t} onClick={() => setCatType(t)}
                  style={{ padding: '7px 18px', borderRadius: '8px', border: '1.5px solid', cursor: 'pointer', fontSize: '13px',
                    background: catType === t ? '#1d4ed8' : '#fff',
                    color: catType === t ? '#fff' : '#555',
                    borderColor: catType === t ? '#1d4ed8' : '#e0e0e0' }}>
                  내역{t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem', minHeight: '80px' }}>
              {(catType === 1 ? cat1List : cat2List).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#f9f9f9', borderRadius: '8px', fontSize: '14px' }}>
                  <span>{c.name}</span>
                  <span style={{ color: '#1d4ed8', fontWeight: 500, marginLeft: 'auto', marginRight: '12px' }}>{c.price.toLocaleString()}원</span>
                  <button className="delete-btn" onClick={() => handleDeleteCategory(c.id)}>삭제</button>
                </div>
              ))}
              {(catType === 1 ? cat1List : cat2List).length === 0 && <p className="empty">등록된 카테고리가 없습니다.</p>}
            </div>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              <input type="text" placeholder="카테고리 이름" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})}
                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              <input type="number" placeholder="단가 (원)" value={catForm.price} onChange={e => setCatForm({...catForm, price: e.target.value})}
                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              <button type="submit" className="btn-primary">추가</button>
            </form>
            {error && <p className="field-error">⚠ {error}</p>}
            <div className="modal-btns">
              <button className="btn-outline" onClick={() => setShowCatModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
