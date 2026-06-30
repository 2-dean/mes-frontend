import { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { prodResultApi } from '../../api/prodResultApi';
import { dailyCloseApi } from '../../api/dailyCloseApi';
import { useAuth } from '../../context/AuthContext';
import { useMultiGridDirty } from '../../hooks/useMultiGridDirty';

ModuleRegistry.registerModules([AllCommunityModule]);

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyClose() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [closes, setCloses] = useState([]);
  const [closeDate, setCloseDate] = useState(today());
  const gridRef = useRef();
  const { makeGuard } = useMultiGridDirty(2);

  const loadResults = () => prodResultApi.getAll().then((r) => setResults(r.data));
  const loadCloses = () => dailyCloseApi.getAll().then((r) => setCloses(r.data));

  useEffect(() => {
    loadResults();
    loadCloses();
  }, []);

  const handleClose = async () => {
    if (!closeDate) return alert('마감일자를 선택하세요.');
    const already = closes.find((c) => c.closeDate === closeDate && c.closeYn === 'Y');
    if (already) return alert(`${closeDate}은 이미 마감되었습니다.`);
    if (!window.confirm(`${closeDate} 일마감 처리하시겠습니까?`)) return;
    await dailyCloseApi.close({ closeDate, closedBy: user?.username });
    loadCloses();
    loadResults();
  };

  const handleCancelClose = async () => {
    if (!closeDate) return alert('취소할 마감일자를 선택하세요.');
    if (!window.confirm(`${closeDate} 일마감을 취소하시겠습니까?`)) return;
    await dailyCloseApi.cancel({ closeDate });
    loadCloses();
    loadResults();
  };

  const isClosedDate = (date) => closes.some((c) => c.closeDate === date && c.closeYn === 'Y');

  const resultColDefs = [
    { field: 'workOrder.workOrderNo', headerName: '작업지시번호', width: 150 },
    { field: 'worker', headerName: '작업자', width: 100 },
    { field: 'prodDate', headerName: '생산일자', width: 120 },
    { field: 'scanQty', headerName: '스캔수량', width: 100 },
    { field: 'manualQty', headerName: '수동수량', width: 100 },
    { field: 'totalQty', headerName: '합계수량', width: 100 },
    {
      headerName: '마감여부', width: 100,
      cellRenderer: (p) => {
        const date = p.data?.prodDate;
        const closed = isClosedDate(date);
        return <span className={`badge ${closed ? 'badge-done' : 'badge-wait'}`}>{closed ? '마감' : '미마감'}</span>;
      },
    },
  ];

  const closeColDefs = [
    { field: 'closeDate', headerName: '마감일자', width: 130 },
    { field: 'closeYn', headerName: '마감여부', width: 90 },
    { field: 'closedBy', headerName: '마감자', width: 100 },
    { field: 'closedAt', headerName: '마감일시', flex: 1 },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">작업실적현황</h2>
        <div className="toolbar-btns">
          <label style={{ marginRight: 8 }}>마감일자</label>
          <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} style={{ marginRight: 8 }} />
          <button className="btn btn-primary" onClick={handleClose}>일마감</button>
          <button className="btn btn-warning" onClick={handleCancelClose}>마감취소</button>
          <button className="btn btn-secondary" onClick={() => { loadResults(); loadCloses(); }}>새로고침</button>
        </div>
      </div>

      <h3 className="section-title">작업실적 목록</h3>
      <div onMouseDownCapture={makeGuard(0)}>
        <div className="ag-theme-alpine grid-wrap" style={{ height: 300 }}>
          <AgGridReact
            ref={gridRef}
            rowData={results}
            columnDefs={resultColDefs}
            pagination
            paginationPageSize={15}
          />
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: 20 }}>일마감 이력</h3>
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
