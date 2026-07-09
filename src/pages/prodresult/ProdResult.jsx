import { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { prodResultApi } from '../../api/prodResultApi';
import { workOrderApi } from '../../api/workOrderApi';
import { itemApi } from '../../api/itemApi';
import { userApi } from '../../api/userApi';
import { commonCodeApi } from '../../api/commonCodeApi';
import { errorMessage } from '../../api/errorMessage';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const LINE_GROUP_CODE = 'CD003';

const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const rowKey = (data) => data.id ?? data._tempId;

export default function ProdResult() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [lines, setLines] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]); // IN_PROGRESS만
  const [rows, setRows] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);

  const [scanModal, setScanModal] = useState(false);
  const [scanWorkOrderId, setScanWorkOrderId] = useState('');
  const [scanQty, setScanQty] = useState(1);
  const [scanInfo, setScanInfo] = useState(null); // { planQty, currentTotal }

  const gridRef = useRef();
  const newRowSeq = useRef(0);

  const refreshWorkOrders = () =>
    workOrderApi
      .getAll()
      .then((r) => setWorkOrders(r.data.filter((w) => w.status === 'IN_PROGRESS' && w.planDate === date)));

  useEffect(() => {
    itemApi.getAll().then((r) => setItems(r.data.filter((i) => i.useYn === 'Y')));
    commonCodeApi.getCodesByGroupCode(LINE_GROUP_CODE).then((r) => setLines(r.data));
    userApi.getSimple().then((r) => setWorkers(r.data));
    prodResultApi.search({ prodDate: today() }).then((r) => setRows(r.data));
  }, []);

  useEffect(() => {
    refreshWorkOrders();
  }, [date]);

  const loadResults = (itemId = selectedItem, line = selectedLine, d = date) => {
    prodResultApi
      .search({ itemId: itemId || undefined, line: line || undefined, prodDate: d || undefined })
      .then((r) => setRows(r.data));
  };

  const handleItemChange = (e) => setSelectedItem(e.target.value);
  const handleLineChange = (e) => setSelectedLine(e.target.value);
  const handleDateChange = (e) => setDate(e.target.value);
  const handleSearch = () => loadResults();

  // ────────────── 스캔입력 팝업 ──────────────
  const openScanModal = () => {
    setScanWorkOrderId('');
    setScanQty(1);
    setScanInfo(null);
    setScanModal(true);
  };

  const handleScanWoChange = async (e) => {
    const id = e.target.value;
    setScanWorkOrderId(id);
    setScanInfo(null);
    if (!id) return;
    const wo = workOrders.find((w) => String(w.id) === id);
    const r = await prodResultApi.getByWorkOrderId(id);
    const currentTotal = r.data.reduce((sum, x) => sum + (x.totalQty || 0), 0);
    setScanInfo({ planQty: wo.planQty, currentTotal });
  };

  const handleScanSubmit = async () => {
    if (!scanWorkOrderId) return alert('작업지시를 선택하세요.');
    const qty = Number(scanQty);
    if (!Number.isInteger(qty) || qty <= 0) return alert('스캔수량을 입력하세요.');
    if (scanInfo && qty > scanInfo.planQty - scanInfo.currentTotal) {
      return alert(
        `계획수량 초과! 계획수량 ${scanInfo.planQty}개 중 현재 ${scanInfo.currentTotal}개, ` +
        `최대 ${scanInfo.planQty - scanInfo.currentTotal}개까지 입력 가능합니다.`
      );
    }
    setLoading(true);
    try {
      await prodResultApi.scan({ workOrderId: Number(scanWorkOrderId), worker: user.username, qty });
      setScanModal(false);
      loadResults();
      refreshWorkOrders();
    } catch (err) {
      alert(err.response?.data?.message || '스캔 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ────────────── 그리드 인라인 편집 ──────────────
  const handleAddRow = () => {
    const tempId = `new-${++newRowSeq.current}`;
    const newRow = {
      _tempId: tempId,
      _isDirty: true,
      workOrder: null,
      worker: '',
      scanQty: 0,
      manualQty: 0,
      totalQty: 0,
      prodDate: date,
    };
    setRows((rs) => [newRow, ...rs]);
  };

  const handleCellValueChanged = (e) => {
    e.data._isDirty = true;
  };

  const handleSaveGrid = async () => {
    const gridApi = gridRef.current.api;
    gridApi.stopEditing();

    const tasks = [];
    let invalid = null;
    let anyDirty = false;

    gridApi.forEachNode((node) => {
      const data = node.data;
      if (!data._isDirty) return;
      anyDirty = true;
      if (data.id) {
        tasks.push(prodResultApi.updateManualQty(data.id, Number(data.manualQty) || 0));
      } else if (!data.workOrder?.id) {
        invalid = '작업지시를 선택하세요.';
      } else if (!data.worker) {
        invalid = '작업자를 선택하세요.';
      } else {
        tasks.push(
          prodResultApi.manual({ workOrderId: data.workOrder.id, worker: data.worker, qty: Number(data.manualQty) || 0 })
        );
      }
    });

    if (!anyDirty) return alert('변경된 행이 없습니다.');
    if (invalid) return alert(invalid);

    try {
      await Promise.all(tasks);
      loadResults();
      refreshWorkOrders();
      alert('저장되었습니다.');
    } catch (err) {
      alert(errorMessage(err, '저장에 실패했습니다.'));
    }
  };

  const handleDelete = async () => {
    const sel = gridRef.current.api.getSelectedRows();
    if (!sel.length) return alert('삭제할 행을 선택하세요.');
    const persisted = sel.filter((r) => r.id);
    const tempOnly = sel.filter((r) => !r.id);
    if (persisted.length && !window.confirm(`${persisted.length}건을 삭제하시겠습니까?`)) return;

    const succeeded = [...tempOnly];
    const failMessages = [];

    if (persisted.length) {
      const results = await Promise.allSettled(persisted.map((r) => prodResultApi.delete(r.id)));
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          succeeded.push(persisted[i]);
        } else {
          const msg = errorMessage(res.reason, '삭제에 실패했습니다.');
          failMessages.push(`${persisted[i].workOrder?.workOrderNo || persisted[i].id}: ${msg}`);
        }
      });
    }

    if (succeeded.length) {
      const idsToRemove = new Set(succeeded.map(rowKey));
      setRows((rs) => rs.filter((r) => !idsToRemove.has(rowKey(r))));
    }

    if (failMessages.length) alert(failMessages.join('\n'));
    else if (succeeded.length) alert('삭제되었습니다.');
  };

  const colDefs = [
    { checkboxSelection: true, width: 50 },
    {
      field: 'workOrder.workOrderNo',
      headerName: '작업지시',
      width: 230,
      editable: (p) => !p.data.id,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: workOrders.map((w) => String(w.id)) },
      refData: Object.fromEntries(workOrders.map((w) => [String(w.id), `${w.workOrderNo} (${w.itemName})`])),
      valueFormatter: (p) => p.value || '',
      valueSetter: (p) => {
        const wo = workOrders.find((w) => String(w.id) === String(p.newValue));
        if (!wo) return false;
        p.data.workOrder = {
          id: wo.id,
          workOrderNo: wo.workOrderNo,
          planQty: wo.planQty,
          line: wo.line,
          item: { itemName: wo.itemName },
        };
        return true;
      },
    },
    { field: 'workOrder.item.itemName', headerName: '품목명', width: 150 },
    { field: 'workOrder.planQty', headerName: '계획수량', width: 110 },
    { field: 'workOrder.line', headerName: '라인', width: 100 },
    {
      field: 'worker', headerName: '작업자', width: 120,
      editable: (p) => !p.data.id,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: workers.map((w) => w.username) },
    },
    { field: 'prodDate', headerName: '생산일자', width: 130 },
    { field: 'scanQty', headerName: '스캔수량', width: 110 },
    {
      field: 'manualQty', headerName: '수동수량', width: 110,
      editable: true, cellEditor: 'agNumberCellEditor', cellEditorParams: { min: 0 },
    },
    { field: 'totalQty', headerName: '합계수량', width: 110, editable: false },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">생산실적</h2>
        <div className="toolbar-btns">
          <button className="btn btn-primary" onClick={openScanModal}>스캔입력</button>
          <button className="btn btn-secondary" onClick={handleAddRow}>행추가</button>
          <button className="btn btn-success" onClick={handleSaveGrid}>저장</button>
          {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>삭제</button>}
          <button className="btn btn-secondary" onClick={() => loadResults()}>새로고침</button>
        </div>
      </div>

      <div className="scan-panel">
        <div className="scan-row">
          <div className="form-group-inline">
            <label>생산일자</label>
            <input type="date" value={date} onChange={handleDateChange} />
          </div>
          <div className="form-group-inline">
            <label>품목</label>
            <select value={selectedItem} onChange={handleItemChange}>
              <option value="">전체</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.itemCode} - {i.itemName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group-inline">
            <label>라인</label>
            <select value={selectedLine} onChange={handleLineChange}>
              <option value="">전체</option>
              {lines.map((l) => (
                <option key={l.code} value={l.codeName}>{l.codeName}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleSearch}>조회</button>
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
          onCellValueChanged={handleCellValueChanged}
        />
      </div>

      {scanModal && (
        <div className="modal-overlay" onClick={() => setScanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>스캔입력</h3>
              <button className="modal-close" onClick={() => setScanModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>작업지시 *</label>
                <select value={scanWorkOrderId} onChange={handleScanWoChange}>
                  <option value="">-- 선택 --</option>
                  {workOrders.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.workOrderNo} - {w.itemName} ({w.line})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>작업자</label>
                <input value={user?.username || ''} readOnly />
              </div>
              <div className="form-row">
                <label>스캔수량 *</label>
                <input
                  type="number"
                  value={scanQty}
                  onChange={(e) => setScanQty(Number(e.target.value))}
                  min="1"
                />
              </div>
              {scanInfo && (
                <div style={{ marginTop: '8px', color: scanQty > scanInfo.planQty - scanInfo.currentTotal ? '#dc3545' : '#555' }}>
                  계획수량 {scanInfo.planQty}개 중 현재 {scanInfo.currentTotal}개,
                  {' '}최대 {scanInfo.planQty - scanInfo.currentTotal}개 입력 가능
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleScanSubmit} disabled={loading}>스캔</button>
              <button className="btn btn-secondary" onClick={() => setScanModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
