import { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { prodIncentiveApi } from '../../api/prodIncentiveApi';
import { monthCloseApi } from '../../api/monthCloseApi';
import { useAuth } from '../../context/AuthContext';
import { useMultiGridDirty } from '../../hooks/useMultiGridDirty';

ModuleRegistry.registerModules([AllCommunityModule]);

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function Incentive() {
  const { user } = useAuth();
  const [incentives, setIncentives] = useState([]);
  const [closes, setCloses] = useState([]);
  const [yearMonth, setYearMonth] = useState(thisMonth());
  const { makeGuard } = useMultiGridDirty(2);

  const loadIncentives = () => prodIncentiveApi.getAll().then((r) => setIncentives(r.data));
  const loadCloses = () => monthCloseApi.getAll().then((r) => setCloses(r.data));

  useEffect(() => {
    loadIncentives();
    loadCloses();
  }, []);

  const handleClose = async () => {
    if (!yearMonth) return alert('마감년월을 선택하세요.');
    const already = closes.find((c) => c.yearMonth === yearMonth && c.closeYn === 'Y');
    if (already) return alert(`${yearMonth}은 이미 월마감 되었습니다.`);
    if (!window.confirm(`${yearMonth} 월마감 처리하시겠습니까?`)) return;
    await monthCloseApi.close({ yearMonth, closedBy: user?.username });
    loadCloses();
    loadIncentives();
  };

  const handleCancelClose = async () => {
    if (!yearMonth) return alert('취소할 년월을 선택하세요.');
    if (!window.confirm(`${yearMonth} 월마감을 취소하시겠습니까?`)) return;
    await monthCloseApi.cancel({ yearMonth });
    loadCloses();
    loadIncentives();
  };

  const filtered = yearMonth
    ? incentives.filter((i) => {
        const d = i.closeDate || '';
        return d.startsWith(yearMonth);
      })
    : incentives;

  const totalAmount = filtered.reduce((s, i) => s + (i.amount || 0), 0);

  const incColDefs = [
    { field: 'workOrder.workOrderNo', headerName: '작업지시번호', width: 150 },
    { field: 'worker', headerName: '작업자', width: 100 },
    { field: 'closeDate', headerName: '마감일자', width: 120 },
    { field: 'qty', headerName: '수량', width: 90 },
    { field: 'unitPrice', headerName: '단가', width: 100, valueFormatter: (p) => p.value?.toLocaleString() },
    { field: 'incentiveRate', headerName: '인센티브율(%)', width: 130 },
    { field: 'amount', headerName: '인센티브금액', width: 130, valueFormatter: (p) => p.value?.toLocaleString() },
    {
      field: 'confirmYn', headerName: '확정', width: 80,
      cellRenderer: (p) => (
        <span className={`badge ${p.value === 'Y' ? 'badge-done' : 'badge-wait'}`}>
          {p.value === 'Y' ? '확정' : '미확정'}
        </span>
      ),
    },
  ];

  const closeColDefs = [
    { field: 'yearMonth', headerName: '마감년월', width: 120 },
    { field: 'closeYn', headerName: '마감여부', width: 90 },
    { field: 'closedBy', headerName: '마감자', width: 100 },
    { field: 'closedAt', headerName: '마감일시', flex: 1 },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">인센티브현황</h2>
        <div className="toolbar-btns">
          <label style={{ marginRight: 8 }}>마감년월</label>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button className="btn btn-primary" onClick={handleClose}>월마감</button>
          <button className="btn btn-warning" onClick={handleCancelClose}>마감취소</button>
          <button className="btn btn-secondary" onClick={() => { loadIncentives(); loadCloses(); }}>새로고침</button>
        </div>
      </div>

      <div className="summary-bar">
        <span>조회 건수: <strong>{filtered.length}</strong>건</span>
        <span style={{ marginLeft: 24 }}>합계 인센티브: <strong>{totalAmount.toLocaleString()}</strong>원</span>
      </div>

      <h3 className="section-title">인센티브 목록</h3>
      <div onMouseDownCapture={makeGuard(0)}>
        <div className="ag-theme-alpine grid-wrap" style={{ height: 300 }}>
          <AgGridReact
            rowData={filtered}
            columnDefs={incColDefs}
            pagination
            paginationPageSize={15}
          />
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: 20 }}>월마감 이력</h3>
      <div onMouseDownCapture={makeGuard(1)}>
        <div className="ag-theme-alpine grid-wrap" style={{ height: 200 }}>
          <AgGridReact
            rowData={closes}
            columnDefs={closeColDefs}
            pagination
            paginationPageSize={10}
          />
        </div>
      </div>
    </div>
  );
}
