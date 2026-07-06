import { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { workOrderApi } from '../../api/workOrderApi';
import { itemApi } from '../../api/itemApi';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const today = () => new Date().toISOString().slice(0, 10);

const defaultForm = {
  workOrderNo: '', itemId: '', planQty: 0, planDate: today(),
  status: 'WAIT', line: '', remark: '', useYn: 'Y',
};

const defaultSearch = { startDate: today(), endDate: today(), status: '', confirmYn: '' };

export default function WorkOrderList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState(defaultSearch);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const gridRef = useRef();

  const load = (params = search) => workOrderApi.getAll(params).then((r) => setRows(r.data));
  useEffect(() => {
    load();
    itemApi.getAll().then((r) => setItems(r.data.filter((i) => i.useYn === 'Y')));
  }, []);

  const sf = (key) => (e) => setSearch((s) => ({ ...s, [key]: e.target.value }));
  const handleSearch = () => load(search);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setModal(true); };
  const openEdit = (row) => {
    setForm({
      workOrderNo: row.workOrderNo,
      itemId: row.item?.id || '',
      planQty: row.planQty,
      planDate: row.planDate,
      status: row.status,
      line: row.line || '',
      remark: row.remark || '',
      useYn: row.useYn,
    });
    setEditId(row.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.workOrderNo || !form.itemId) return alert('작업지시번호/품목은 필수입니다.');
    const payload = { ...form, item: { id: Number(form.itemId) } };
    if (editId) await workOrderApi.update(editId, payload);
    else await workOrderApi.create(payload);
    setModal(false);
    load(search);
  };

  const handleDelete = async () => {
    const sel = gridRef.current.api.getSelectedRows();
    if (!sel.length) return alert('삭제할 행을 선택하세요.');
    if (!window.confirm(`${sel.length}건을 삭제하시겠습니까?`)) return;
    await Promise.all(sel.map((r) => workOrderApi.delete(r.id)));
    load(search);
  };

  const handleStart = async () => {
    const sel = gridRef.current.api.getSelectedRows();
    if (!sel.length) return alert('행을 선택하세요.');
    await Promise.all(sel.map((r) => workOrderApi.start(r.id)));
    load(search);
  };

  const handleConfirm = async () => {
    const sel = gridRef.current.api.getSelectedRows();
    if (!sel.length) return alert('행을 선택하세요.');
    await Promise.all(sel.map((r) => workOrderApi.confirm(r.id)));
    load(search);
  };

  const handleCancelConfirm = async () => {
    const sel = gridRef.current.api.getSelectedRows();
    if (!sel.length) return alert('행을 선택하세요.');
    await Promise.all(sel.map((r) => workOrderApi.cancelConfirm(r.id)));
    load(search);
  };

  const statusBadge = (status) => {
    const map = { WAIT: '대기', IN_PROGRESS: '진행중', DONE: '완료' };
    const cls = { WAIT: 'badge-wait', IN_PROGRESS: 'badge-progress', DONE: 'badge-done' };
    return <span className={`badge ${cls[status]}`}>{map[status] || status}</span>;
  };

  const colDefs = [
    { checkboxSelection: true, width: 50, headerCheckboxSelection: true },
    { field: 'workOrderNo', headerName: '작업지시번호', width: 150 },
    { field: 'itemName', headerName: '품목명', flex: 1 },
    { field: 'itemCode', headerName: '품목코드', width: 120 },
    { field: 'planQty', headerName: '계획수량', width: 100 },
    { field: 'planDate', headerName: '작업일자', width: 120 },
    { field: 'line', headerName: '라인', width: 100 },
    {
      field: 'status', headerName: '상태', width: 100,
      cellRenderer: (p) => statusBadge(p.value),
    },
    {
      field: 'confirmYn', headerName: '확정', width: 80,
      cellRenderer: (p) => (
        <span className={`badge ${p.value === 'Y' ? 'badge-done' : 'badge-wait'}`}>
          {p.value === 'Y' ? '확정' : '미확정'}
        </span>
      ),
    },
    ...(isAdmin ? [{
      headerName: '수정', width: 80,
      cellRenderer: (p) => <button className="btn-grid" onClick={() => openEdit(p.data)}>수정</button>,
    }] : []),
  ];

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">작업지시</h2>
        <div className="toolbar-btns">
          {isAdmin && <button className="btn btn-primary" onClick={openCreate}>등록</button>}
          {isAdmin && (
            <button className="btn btn-info" onClick={handleStart}
              disabled={!selectedRows.length || selectedRows.some(r => r.status !== 'WAIT')}>
              작업시작
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-success" onClick={handleConfirm}
              disabled={!selectedRows.length || selectedRows.some(r => r.status !== 'DONE')}>
              확정
            </button>
          )}
          {isAdmin && <button className="btn btn-warning" onClick={handleCancelConfirm}>확정취소</button>}
          {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>삭제</button>}
          <button className="btn btn-secondary" onClick={() => load(search)}>새로고침</button>
        </div>
      </div>

      <div className="search-bar">
        <label>작업일자</label>
        <input type="date" value={search.startDate} onChange={sf('startDate')} />
        <span>~</span>
        <input type="date" value={search.endDate} onChange={sf('endDate')} />
        <label>상태</label>
        <select value={search.status} onChange={sf('status')}>
          <option value="">전체</option>
          <option value="WAIT">대기</option>
          <option value="IN_PROGRESS">진행중</option>
          <option value="DONE">완료</option>
        </select>
        <label>확정여부</label>
        <select value={search.confirmYn} onChange={sf('confirmYn')}>
          <option value="">전체</option>
          <option value="N">미확정</option>
          <option value="Y">확정</option>
        </select>
        <button className="btn btn-primary" onClick={handleSearch}>조회</button>
      </div>

      <div className="ag-theme-alpine grid-wrap">
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={colDefs}
          rowSelection="multiple"
          pagination
          paginationPageSize={20}
          onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
        />
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? '작업지시 수정' : '작업지시 등록'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>작업지시번호 *</label>
                <input value={form.workOrderNo} onChange={f('workOrderNo')} disabled={!!editId} />
              </div>
              <div className="form-row">
                <label>품목 *</label>
                <select value={form.itemId} onChange={f('itemId')}>
                  <option value="">-- 선택 --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.itemCode} - {i.itemName}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>계획수량</label>
                <input type="number" value={form.planQty} onChange={(e) => setForm({ ...form, planQty: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label>작업일자</label>
                <input type="date" value={form.planDate} onChange={f('planDate')} />
              </div>
              <div className="form-row">
                <label>상태</label>
                <select value={form.status} onChange={f('status')}>
                  <option value="WAIT">대기</option>
                  <option value="IN_PROGRESS">진행중</option>
                  <option value="DONE">완료</option>
                </select>
              </div>
              <div className="form-row">
                <label>생산라인</label>
                <input value={form.line} onChange={f('line')} />
              </div>
              <div className="form-row">
                <label>비고</label>
                <input value={form.remark} onChange={f('remark')} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleSave}>저장</button>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
