import { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { itemApi } from '../../api/itemApi';

ModuleRegistry.registerModules([AllCommunityModule]);

const defaultItem = {
  itemCode: '', itemName: '', spec: '', unit: '', unitPrice: 0, incentiveRate: 0, useYn: 'Y',
};

export default function ItemList() {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultItem);
  const [editId, setEditId] = useState(null);
  const gridRef = useRef();

  const load = () => itemApi.getAll().then((r) => setRows(r.data));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(defaultItem); setEditId(null); setModal(true); };
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true); };

  const handleSave = async () => {
    if (!form.itemCode || !form.itemName) return alert('품목코드/품목명은 필수입니다.');
    if (editId) await itemApi.update(editId, form);
    else await itemApi.create(form);
    setModal(false);
    load();
  };

  const handleDelete = async () => {
    const selected = gridRef.current.api.getSelectedRows();
    if (!selected.length) return alert('삭제할 행을 선택하세요.');
    if (!window.confirm(`${selected.length}건을 삭제하시겠습니까?`)) return;
    await Promise.all(selected.map((r) => itemApi.delete(r.id)));
    load();
  };

  const colDefs = [
    { checkboxSelection: true, width: 50, headerCheckboxSelection: true },
    { field: 'itemCode', headerName: '품목코드', width: 130 },
    { field: 'itemName', headerName: '품목명', flex: 1 },
    { field: 'spec', headerName: '규격', width: 120 },
    { field: 'unit', headerName: '단위', width: 80 },
    { field: 'unitPrice', headerName: '단가', width: 110, valueFormatter: (p) => p.value?.toLocaleString() },
    { field: 'incentiveRate', headerName: '인센티브율(%)', width: 130 },
    { field: 'useYn', headerName: '사용여부', width: 90 },
    {
      headerName: '수정', width: 80,
      cellRenderer: (p) => (
        <button className="btn-grid" onClick={() => openEdit(p.data)}>수정</button>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">품목관리</h2>
        <div className="toolbar-btns">
          <button className="btn btn-primary" onClick={openCreate}>등록</button>
          <button className="btn btn-danger" onClick={handleDelete}>삭제</button>
          <button className="btn btn-secondary" onClick={load}>새로고침</button>
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

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? '품목 수정' : '품목 등록'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>품목코드 *</label>
                <input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} disabled={!!editId} />
              </div>
              <div className="form-row">
                <label>품목명 *</label>
                <input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
              </div>
              <div className="form-row">
                <label>규격</label>
                <input value={form.spec || ''} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
              </div>
              <div className="form-row">
                <label>단위</label>
                <input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="form-row">
                <label>단가</label>
                <input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label>인센티브율(%)</label>
                <input type="number" value={form.incentiveRate} onChange={(e) => setForm({ ...form, incentiveRate: Number(e.target.value) })} />
              </div>
              <div className="form-row">
                <label>사용여부</label>
                <select value={form.useYn} onChange={(e) => setForm({ ...form, useYn: e.target.value })}>
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
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
