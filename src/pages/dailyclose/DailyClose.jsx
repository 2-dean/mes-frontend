import { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { prodResultApi } from '../../api/prodResultApi';
import { dailyCloseApi } from '../../api/dailyCloseApi';
import { workOrderApi } from '../../api/workOrderApi';
import { userApi } from '../../api/userApi';
import { errorMessage } from '../../api/errorMessage';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const badge = (v, onLabel, offLabel) => (
  <span className={`badge ${v === 'Y' ? 'badge-done' : 'badge-wait'}`}>{v === 'Y' ? onLabel : offLabel}</span>
);

export default function DailyClose() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [closeDate, setCloseDate] = useState(today());
  const [workOrders, setWorkOrders] = useState([]); // 해당일자 확정된 작업지시
  const [prodResults, setProdResults] = useState([]); // 해당일자 생산실적 전체 (작업자별)
  const [closes, setCloses] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(null);

  const isClosed = closes.some((c) => c.closeDate === closeDate && c.closeYn === 'Y');

  const workerLabel = (username) => {
    if (!username) return '';
    const w = workers.find((x) => x.username === username);
    return w ? `${w.name} (${w.username})` : username;
  };

  const loadData = (date = closeDate) => {
    workOrderApi.getAll({ startDate: date, endDate: date, confirmYn: 'Y' }).then((r) => {
      setWorkOrders(r.data);
      setSelectedWorkOrderId(r.data.length ? r.data[0].id : null);
    });
    prodResultApi.search({ prodDate: date }).then((r) => setProdResults(r.data));
  };

  const loadCloses = () => dailyCloseApi.getAll().then((r) => setCloses(r.data));

  useEffect(() => {
    loadCloses();
    userApi.getSimple().then((r) => setWorkers(r.data));
  }, []);
  useEffect(() => { loadData(closeDate); }, [closeDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = async () => {
    if (!closeDate) return alert('마감일자를 선택하세요.');
    if (isClosed) return alert(`${closeDate}은 이미 마감되었습니다.`);
    if (!window.confirm(`${closeDate} 일마감 처리하시겠습니까?`)) return;
    try {
      await dailyCloseApi.close({ closeDate, closedBy: user?.username });
      await loadCloses();
      loadData(closeDate);
      alert('일마감 처리되었습니다.');
    } catch (e) {
      alert(errorMessage(e, '일마감 처리에 실패했습니다.'));
    }
  };

  const handleCancelClose = async () => {
    if (!closeDate) return alert('취소할 마감일자를 선택하세요.');
    if (!isClosed) return alert(`${closeDate}은 마감된 상태가 아닙니다.`);
    if (!window.confirm(`${closeDate} 일마감을 취소하시겠습니까?`)) return;
    try {
      await dailyCloseApi.cancel({ closeDate });
      await loadCloses();
      loadData(closeDate);
      alert('일마감이 취소되었습니다.');
    } catch (e) {
      alert(errorMessage(e, '일마감 취소에 실패했습니다.'));
    }
  };

  // ── 상단: 작업지시별 집계 ──
  const summaryRows = useMemo(() => workOrders.map((wo) => {
    const totalQty = prodResults
      .filter((r) => r.workOrder?.id === wo.id)
      .reduce((sum, r) => sum + (r.totalQty || 0), 0);
    return {
      id: wo.id,
      workOrderNo: wo.workOrderNo,
      itemName: wo.itemName,
      planQty: wo.planQty,
      totalQty,
      confirmYn: wo.confirmYn,
      closeYn: isClosed ? 'Y' : 'N',
    };
  }), [workOrders, prodResults, isClosed]);

  const summaryColDefs = [
    { field: 'workOrderNo', headerName: '작업지시번호', width: 170 },
    { field: 'itemName', headerName: '품목명', flex: 1, minWidth: 140 },
    { field: 'planQty', headerName: '계획수량', width: 110 },
    { field: 'totalQty', headerName: '총합계수량', width: 120 },
    { field: 'confirmYn', headerName: '확정여부', width: 100, cellRenderer: (p) => badge(p.value, '확정', '미확정') },
    { field: 'closeYn', headerName: '일마감여부', width: 110, cellRenderer: (p) => badge(p.value, '마감', '미마감') },
  ];

  // ── 하단: 선택한 작업지시의 작업자별 상세 ──
  const detailRows = useMemo(
    () => (selectedWorkOrderId ? prodResults.filter((r) => r.workOrder?.id === selectedWorkOrderId) : []),
    [prodResults, selectedWorkOrderId]
  );

  const detailColDefs = [
    { field: 'worker', headerName: '작업자', width: 150, valueFormatter: (p) => workerLabel(p.value) },
    { field: 'prodDate', headerName: '생산일자', width: 130 },
    { field: 'scanQty', headerName: '스캔수량', width: 110 },
    { field: 'manualQty', headerName: '수동수량', width: 110 },
    { field: 'totalQty', headerName: '합계수량', width: 110 },
  ];

  const selectedWorkOrder = workOrders.find((wo) => wo.id === selectedWorkOrderId);

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">작업실적현황</h2>
        <div className="toolbar-btns">
          <label style={{ marginRight: 8 }}>마감일자</label>
          <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} style={{ marginRight: 8 }} />
          {isAdmin && <button className="btn btn-primary" onClick={handleClose}>일마감</button>}
          {isAdmin && <button className="btn btn-warning" onClick={handleCancelClose}>일마감취소</button>}
          <button className="btn btn-secondary" onClick={() => { loadCloses(); loadData(closeDate); }}>새로고침</button>
        </div>
      </div>

      <h3 className="section-title">작업지시별 실적 ({closeDate}, 확정건만)</h3>
      <div className="ag-theme-alpine grid-wrap" style={{ height: 280 }}>
        <AgGridReact
          rowData={summaryRows}
          columnDefs={summaryColDefs}
          rowSelection="single"
          onRowClicked={(e) => setSelectedWorkOrderId(e.data.id)}
          rowClassRules={{ 'row-dirty': (p) => p.data.id === selectedWorkOrderId }}
          pagination
          paginationPageSize={10}
        />
      </div>

      <h3 className="section-title" style={{ marginTop: 20 }}>
        작업자별 상세{selectedWorkOrder ? ` — ${selectedWorkOrder.workOrderNo}` : ''}
      </h3>
      {selectedWorkOrderId ? (
        <div className="ag-theme-alpine grid-wrap" style={{ height: 220 }}>
          <AgGridReact
            rowData={detailRows}
            columnDefs={detailColDefs}
            pagination
            paginationPageSize={10}
          />
        </div>
      ) : (
        <div className="code-detail-empty">위 작업지시 목록에서 행을 선택하세요.</div>
      )}
    </div>
  );
}
