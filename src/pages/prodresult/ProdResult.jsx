import { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { prodResultApi } from '../../api/prodResultApi';
import { workOrderApi } from '../../api/workOrderApi';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function ProdResult() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedWo, setSelectedWo] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [worker, setWorker] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const scanRef = useRef();
  const gridRef = useRef();

  useEffect(() => {
    workOrderApi.getAll().then((r) =>
      setWorkOrders(r.data.filter((w) => w.confirmYn === 'Y' && w.useYn === 'Y'))
    );
    prodResultApi.getAll().then((r) => setRows(r.data));
  }, []);

  const loadResults = (woId) => {
    if (woId) {
      prodResultApi.getByWorkOrderId(woId).then((r) => setRows(r.data));
    } else {
      prodResultApi.getAll().then((r) => setRows(r.data));
    }
  };

  const handleWoChange = (e) => {
    setSelectedWo(e.target.value);
    loadResults(e.target.value);
  };

  const handleScan = async () => {
    if (!selectedWo) return alert('작업지시를 선택하세요.');
    if (!worker) return alert('작업자를 입력하세요.');
    setLoading(true);
    try {
      await prodResultApi.scan({ workOrderId: Number(selectedWo), worker, qty: 1 });
      setScanInput('');
      loadResults(selectedWo);
    } finally {
      setLoading(false);
      scanRef.current?.focus();
    }
  };

  const handleScanKeyDown = (e) => {
    if (e.key === 'Enter') handleScan();
  };

  const handleManual = async () => {
    if (!selectedWo) return alert('작업지시를 선택하세요.');
    if (!worker) return alert('작업자를 입력하세요.');
    if (manualQty <= 0) return alert('수량을 입력하세요.');
    await prodResultApi.manual({ workOrderId: Number(selectedWo), worker, qty: manualQty });
    setManualQty(1);
    loadResults(selectedWo);
  };

  const handleDelete = async () => {
    const sel = gridRef.current.api.getSelectedRows();
    if (!sel.length) return alert('삭제할 행을 선택하세요.');
    if (!window.confirm(`${sel.length}건을 삭제하시겠습니까?`)) return;
    await Promise.all(sel.map((r) => prodResultApi.delete(r.id)));
    loadResults(selectedWo);
  };

  const colDefs = [
    { checkboxSelection: true, width: 50 },
    { field: 'workOrder.workOrderNo', headerName: '작업지시번호', width: 150 },
    { field: 'worker', headerName: '작업자', width: 100 },
    { field: 'prodDate', headerName: '생산일자', width: 120 },
    { field: 'scanQty', headerName: '스캔수량', width: 100 },
    { field: 'manualQty', headerName: '수동수량', width: 100 },
    { field: 'totalQty', headerName: '합계수량', width: 100 },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">생산실적</h2>
        <div className="toolbar-btns">
          <button className="btn btn-danger" onClick={handleDelete}>삭제</button>
          <button className="btn btn-secondary" onClick={() => loadResults(selectedWo)}>새로고침</button>
        </div>
      </div>

      <div className="scan-panel">
        <div className="scan-row">
          <div className="form-group-inline">
            <label>작업지시</label>
            <select value={selectedWo} onChange={handleWoChange}>
              <option value="">전체</option>
              {workOrders.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.workOrderNo} ({w.item?.itemName})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group-inline">
            <label>작업자</label>
            <input value={worker} onChange={(e) => setWorker(e.target.value)} />
          </div>
        </div>

        <div className="scan-row">
          <div className="form-group-inline scan-input-group">
            <label>바코드 스캔</label>
            <input
              ref={scanRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder="바코드를 스캔하거나 Enter..."
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleScan} disabled={loading}>
              스캔
            </button>
          </div>
          <div className="form-group-inline">
            <label>수동입력 수량</label>
            <input
              type="number"
              value={manualQty}
              onChange={(e) => setManualQty(Number(e.target.value))}
              min="1"
            />
            <button className="btn btn-success" onClick={handleManual}>수동입력</button>
          </div>
        </div>
      </div>

      <div className="ag-theme-alpine grid-wrap">
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={colDefs}
          rowSelection="multiple"
          pagination
          paginationPageSize={20}
        />
      </div>
    </div>
  );
}
