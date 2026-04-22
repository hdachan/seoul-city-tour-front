// SalesContent.jsx
export function SalesContent() {
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>💼 영업 대시보드</h2>
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">담당 고객</div><div className="metric-val">42명</div></div>
        <div className="metric"><div className="metric-label">진행 계약</div><div className="metric-val">6건</div></div>
        <div className="metric"><div className="metric-label">이번달 매출</div><div className="metric-val">₩8.1M</div></div>
        <div className="metric"><div className="metric-label">계약 성사율</div><div className="metric-val">73%</div></div>
      </div>
    </div>
  );
}

// GuideContent.jsx
export function GuideContent() {
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>📖 가이드 대시보드</h2>
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">등록 콘텐츠</div><div className="metric-val">87개</div></div>
        <div className="metric"><div className="metric-label">FAQ 항목</div><div className="metric-val">53개</div></div>
        <div className="metric"><div className="metric-label">공지사항</div><div className="metric-val">12개</div></div>
        <div className="metric"><div className="metric-label">오늘 조회수</div><div className="metric-val">348</div></div>
      </div>
    </div>
  );
}

// DevContent.jsx
export function DevContent() {
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem' }}>💻 개발자 대시보드</h2>
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">API 엔드포인트</div><div className="metric-val">34개</div></div>
        <div className="metric"><div className="metric-label">CPU 사용률</div><div className="metric-val">23%</div></div>
        <div className="metric"><div className="metric-label">메모리</div><div className="metric-val">61%</div></div>
        <div className="metric"><div className="metric-label">업타임</div><div className="metric-val">14일</div></div>
      </div>
    </div>
  );
}
