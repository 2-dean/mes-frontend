import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { clientApi } from '../../api/clientApi';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function ClientList() {
  const [rows, setRows] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const gridRef = useRef();

  const load = useCallback(async () => {
    const r = await clientApi.getAll();
    setRows(r.data);
    setHasChanges(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddRow = () => {
    const newRow = {
      _rowId: `_new_${Date.now()}`,
      _isNew: true,
      clientCode: '', clientName: '', bizNo: '', clientType: '매출',
      tel: '', zipCode: '', address: '', addressDetail: '', useYn: 'Y',
    };
    setRows((prev) => [newRow, ...prev]);
    setHasChanges(true);
    setTimeout(() => {
      gridRef.current?.api?.startEditingCell({ rowIndex: 0, colKey: 'clientCode' });
    }, 100);
  };

  const handleSave = async () => {
    gridRef.current.api.stopEditing();

    const allRows = [];
    gridRef.current.api.forEachNode((node) => allRows.push(node.data));

    const newRows = allRows.filter((r) => r._isNew);
    const dirtyRows = allRows.filter((r) => !r._isNew && r._isDirty);

    if (!newRows.length && !dirtyRows.length) return alert('변경된 내용이 없습니다.');

    if ([...newRows, ...dirtyRows].some((r) => !r.clientCode || !r.clientName)) {
      return alert('거래처코드/거래처명은 필수입니다.');
    }

    try {
      await Promise.all([
        ...newRows.map(({ _rowId, _isNew, ...data }) => clientApi.create(data)),
        ...dirtyRows.map(({ _isDirty, ...data }) => clientApi.update(data.id, data)),
      ]);
      await load();
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    const selected = gridRef.current.api.getSelectedRows();
    if (!selected.length) return alert('삭제할 행을 선택하세요.');
    if (!window.confirm(`${selected.length}건을 삭제하시겠습니까?`)) return;

    const existing = selected.filter((r) => !r._isNew);
    const unsaved = selected.filter((r) => r._isNew);

    try {
      if (existing.length) {
        await Promise.all(existing.map((r) => clientApi.delete(r.id)));
        await load();
      } else {
        const ids = new Set(unsaved.map((r) => r._rowId));
        setRows((prev) => prev.filter((r) => !r._isNew || !ids.has(r._rowId)));
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleRefresh = () => {
    if (hasChanges && !window.confirm('저장하지 않은 변경사항이 있습니다. 새로고침하시겠습니까?')) return;
    load();
  };

  const onCellValueChanged = useCallback((params) => {
    if (!params.data._isNew) {
      params.data._isDirty = true;
      params.api.redrawRows({ rowNodes: [params.node] });
    }
    setHasChanges(true);
  }, []);

  const getRowId = useCallback((params) => {
    return params.data._isNew ? params.data._rowId : String(params.data.id);
  }, []);

  const rowClassRules = useMemo(() => ({
    'row-new': (params) => !!params.data._isNew,
    'row-dirty': (params) => !params.data._isNew && !!params.data._isDirty,
  }), []);

  const colDefs = useMemo(() => [
    { checkboxSelection: true, headerCheckboxSelection: true, width: 50, editable: false },
    {
      field: 'clientCode', headerName: '거래처코드 *', width: 130,
      editable: (params) => !!params.data._isNew,
    },
    { field: 'clientName', headerName: '거래처명 *', flex: 1, editable: true },
    {
      field: 'clientType', headerName: '유형', width: 80, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['매출', '매입'] },
    },
    { field: 'bizNo', headerName: '사업자번호', width: 130, editable: true },
    { field: 'tel', headerName: '전화번호', width: 130, editable: true },
    { field: 'zipCode', headerName: '우편번호', width: 90, editable: true },
    { field: 'address', headerName: '주소', flex: 1, editable: true },
    { field: 'addressDetail', headerName: '상세주소', flex: 1, editable: true },
    {
      field: 'useYn', headerName: '사용여부', width: 90, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Y', 'N'] },
    },
  ], []);

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">거래처관리</h2>
        <div className="toolbar-btns">
          <button className="btn btn-primary" onClick={handleAddRow}>행 추가</button>
          <button className="btn btn-success" onClick={handleSave} disabled={!hasChanges}>저장</button>
          <button className="btn btn-danger" onClick={handleDelete}>삭제</button>
          <button className="btn btn-secondary" onClick={handleRefresh}>새로고침</button>
        </div>
      </div>

      <div className="ag-theme-alpine grid-wrap">
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={colDefs}
          rowSelection="multiple"
          getRowId={getRowId}
          onCellValueChanged={onCellValueChanged}
          rowClassRules={rowClassRules}
          singleClickEdit
          stopEditingWhenCellsLoseFocus
          pagination
          paginationPageSize={20}
        />
      </div>
    </div>
  );
}
