import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { itemApi } from '../../api/itemApi';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function ItemList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const gridRef = useRef();

  const load = useCallback(async () => {
    const r = await itemApi.getAll();
    setRows(r.data);
    setHasChanges(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddRow = () => {
    const newRow = {
      _rowId: `_new_${Date.now()}`,
      _isNew: true,
      itemCode: '', itemName: '', spec: '', unit: '', unitPrice: 0, incentiveRate: 0, useYn: 'Y',
    };
    setRows((prev) => [newRow, ...prev]);
    setHasChanges(true);
    setTimeout(() => {
      gridRef.current?.api?.startEditingCell({ rowIndex: 0, colKey: 'itemCode' });
    }, 100);
  };

  const handleSave = async () => {
    gridRef.current.api.stopEditing();

    const allRows = [];
    gridRef.current.api.forEachNode((node) => allRows.push(node.data));

    const newRows = allRows.filter((r) => r._isNew);
    const dirtyRows = allRows.filter((r) => !r._isNew && r._isDirty);

    if (!newRows.length && !dirtyRows.length) return alert('변경된 내용이 없습니다.');

    if ([...newRows, ...dirtyRows].some((r) => !r.itemCode || !r.itemName)) {
      return alert('품목코드/품목명은 필수입니다.');
    }

    try {
      await Promise.all([
        ...newRows.map(({ _rowId, _isNew, ...data }) => itemApi.create(data)),
        ...dirtyRows.map(({ _isDirty, ...data }) => itemApi.update(data.id, data)),
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
        await Promise.all(existing.map((r) => itemApi.delete(r.id)));
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

  // Enter 키로 셀 편집이 종료/이동되지 않도록 차단 (저장은 반드시 버튼으로만)
  const defaultColDef = useMemo(() => ({
    suppressKeyboardEvent: (params) => params.event.key === 'Enter',
  }), []);

  const colDefs = useMemo(() => [
    { checkboxSelection: true, headerCheckboxSelection: true, width: 50, editable: false },
    {
      field: 'itemCode', headerName: '품목코드 *', width: 130,
      editable: (params) => !!params.data._isNew,
      cellEditorParams: { maxLength: 20 },
    },
    {
      field: 'itemName', headerName: '품목명 *', flex: 1, editable: true,
      cellEditorParams: { maxLength: 100 },
    },
    {
      field: 'spec', headerName: '규격', width: 120, editable: true,
      cellEditorParams: { maxLength: 200 },
    },
    {
      field: 'unit', headerName: '단위', width: 80, editable: true,
      cellEditorParams: { maxLength: 10 },
    },
    {
      field: 'unitPrice', headerName: '단가', width: 110, editable: true,
      valueFormatter: (p) => p.value?.toLocaleString(),
      valueParser: (p) => Number(p.newValue) || 0,
    },
    {
      field: 'incentiveRate', headerName: '인센티브율(%)', width: 130, editable: true,
      valueParser: (p) => Number(p.newValue) || 0,
    },
    {
      field: 'useYn', headerName: '사용여부', width: 90, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Y', 'N'] },
    },
  ], []);

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">품목관리</h2>
        <div className="toolbar-btns">
          {isAdmin && <button className="btn btn-primary" onClick={handleAddRow}>행 추가</button>}
          {isAdmin && <button className="btn btn-success" onClick={handleSave} disabled={!hasChanges}>저장</button>}
          {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>삭제</button>}
          <button className="btn btn-secondary" onClick={handleRefresh}>새로고침</button>
        </div>
      </div>

      <div className="ag-theme-alpine grid-wrap">
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
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
