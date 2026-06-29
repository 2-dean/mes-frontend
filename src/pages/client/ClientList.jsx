import { useEffect, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { clientApi } from '../../api/clientApi';

ModuleRegistry.registerModules([AllCommunityModule]);

const defaultClient = {
  clientCode: '', clientName: '', bizNo: '', clientType: '매출',
  tel: '', zipCode: '', address: '', addressDetail: '', useYn: 'Y',
};

export default function ClientList() {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(defaultClient);
  const [editId, setEditId] = useState(null);
  const gridRef = useRef();

  const load = () => clientApi.getAll().then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(defaultClient); setEditId(null); setModal(true); };
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true); };

  const handleSave = async () => {
    if (!form.clientCode || !form.clientName) return alert('거래처코드/거래처명은 필수입니다.');
    if (editId) await clientApi.update(editId, form);
    else await clientApi.create(form);
    setModal(false);
    load();
  };

  const handleDelete = async () => {
    const selected = gridRef.current.api.getSelectedRows();
    if (!selected.length) return alert('삭제할 행을 선택하세요.');
    if (!window.confirm(`${selected.length}건을 삭제하시겠습니까?`)) return;
    await Promise.all(selected.map((r) => clientApi.delete(r.id)));
    load();
  };

  const colDefs = [
    { checkboxSelection: true, width: 50, headerCheckboxSelection: true },
    { field: 'clientCode', headerName: '거래처코드', width: 130 },
    { field: 'clientName', headerName: '거래처명', flex: 1 },
    { field: 'clientType', headerName: '유형', width: 80 },
    { field: 'bizNo', headerName: '사업자번호', width: 130 },
    { field: 'tel', headerName: '전화번호', width: 130 },
    { field: 'address', headerName: '주소', flex: 1 },
    { field: 'useYn', headerName: '사용여부', width: 90 },
    {
      headerName: '수정', width: 80,
      cellRenderer: (p) => <button className="btn-grid" onClick={() => openEdit(p.data)}>수정</button>,
    },
  ];

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">거래처관리</h2>
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
              <h3>{editId ? '거래처 수정' : '거래처 등록'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row"><label>거래처코드 *</label><input value={form.clientCode} onChange={f('clientCode')} disabled={!!editId} /></div>
              <div className="form-row"><label>거래처명 *</label><input value={form.clientName} onChange={f('clientName')} /></div>
              <div className="form-row">
                <label>유형</label>
                <select value={form.clientType} onChange={f('clientType')}>
                  <option value="매출">매출</option>
                  <option value="매입">매입</option>
                </select>
              </div>
              <div className="form-row"><label>사업자번호</label><input value={form.bizNo || ''} onChange={f('bizNo')} placeholder="000-00-00000" /></div>
              <div className="form-row"><label>전화번호</label><input value={form.tel || ''} onChange={f('tel')} /></div>
              <div className="form-row"><label>우편번호</label><input value={form.zipCode || ''} onChange={f('zipCode')} /></div>
              <div className="form-row"><label>주소</label><input value={form.address || ''} onChange={f('address')} /></div>
              <div className="form-row"><label>상세주소</label><input value={form.addressDetail || ''} onChange={f('addressDetail')} /></div>
              <div className="form-row">
                <label>사용여부</label>
                <select value={form.useYn} onChange={f('useYn')}>
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
