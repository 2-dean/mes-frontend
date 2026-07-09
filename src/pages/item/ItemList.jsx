import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { itemApi } from '../../api/itemApi';
import { commonCodeApi } from '../../api/commonCodeApi';
import { errorMessage } from '../../api/errorMessage';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const UNIT_GROUP_CODE = 'CD001';

const defaultSearch = { itemName: '', useYn: 'Y' };

export default function ItemList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState(defaultSearch);
  const gridRef = useRef();

  const load = (params = search) => itemApi.getAll(params).then((r) => {
    setRows(r.data);
  });

  // 편집 중인 셀을 커밋시키고, 저장/새로고침 시점에 실제로 반영해야 할 변경이 있는지 확인
  const hasPendingChanges = () => {
    gridRef.current.api.stopEditing();
    let dirty = false;
    gridRef.current.api.forEachNode((node) => {
      if (node.data._isNew || node.data._isDirty) dirty = true;
    });
    return dirty;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const sf = (key) => (e) => setSearch((s) => ({ ...s, [key]: e.target.value }));
  const handleSearch = () => load(search);

  useEffect(() => {
    commonCodeApi.getCodesByGroupCode(UNIT_GROUP_CODE).then((r) => {
      setUnits(r.data.map((c) => c.code));
    });
  }, []);

  const handleAddRow = () => {
    const newRow = {
      _rowId: `_new_${Date.now()}`,
      _isNew: true,
      itemCode: '', itemName: '', spec: '', unit: units[0] || '', unitPrice: 0, incentiveRate: 0, useYn: 'Y',
    };
    setRows((prev) => [newRow, ...prev]);
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
      alert('저장되었습니다.');
    } catch (e) {
      alert(errorMessage(e, '저장 중 오류가 발생했습니다.'));
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
      alert('삭제되었습니다.');
    } catch (e) {
      alert(errorMessage(e, '삭제 중 오류가 발생했습니다.'));
    }
  };

  const handleRefresh = () => {
    if (hasPendingChanges() && !window.confirm('저장하지 않은 변경사항이 있습니다. 새로고침하시겠습니까?')) return;
    load();
  };

  const onCellValueChanged = useCallback((params) => {
    if (!params.data._isNew) {
      params.data._isDirty = true;
      params.api.redrawRows({ rowNodes: [params.node] });
    }
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
      field: 'unit', headerName: '단위', width: 100, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: units },
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
    { field: 'createdBy', headerName: '등록자', width: 100, editable: false },
    {
      field: 'createdAt', headerName: '등록일', width: 150, editable: false,
      valueFormatter: (p) => p.value ? p.value.replace('T', ' ').substring(0, 16) : '',
    },
    { field: 'updatedBy', headerName: '수정자', width: 100, editable: false },
    {
      field: 'updatedAt', headerName: '수정일', width: 150, editable: false,
      valueFormatter: (p) => p.value ? p.value.replace('T', ' ').substring(0, 16) : '',
    },
  ], [units]);

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">품목관리</h2>
        <div className="toolbar-btns">
          {isAdmin && <button className="btn btn-primary" onClick={handleAddRow}>행 추가</button>}
          {isAdmin && <button className="btn btn-success" onClick={handleSave}>저장</button>}
          {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>삭제</button>}
          <button className="btn btn-secondary" onClick={handleRefresh}>새로고침</button>
        </div>
      </div>

      <div className="search-bar">
        <label>품목명</label>
        <input
          value={search.itemName}
          onChange={sf('itemName')}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="품목명 검색"
        />
        <label>사용여부</label>
        <span className="radio-group">
          {[['', '전체'], ['Y', '사용'], ['N', '미사용']].map(([value, label]) => (
            <label key={value || 'all'} className="radio-item">
              <input
                type="radio"
                name="useYn"
                value={value}
                checked={search.useYn === value}
                onChange={sf('useYn')}
              />
              {label}
            </label>
          ))}
        </span>
        <button className="btn btn-primary" onClick={handleSearch}>조회</button>
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
