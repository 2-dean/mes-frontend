import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { clientApi } from '../../api/clientApi';
import { errorMessage } from '../../api/errorMessage';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const defaultSearch = { clientName: '', useYn: 'Y' };

export default function ClientList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rows, setRows] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState(defaultSearch);
  const gridRef = useRef();

  const load = (params = search) => clientApi.getAll(params).then((r) => {
    setRows(r.data);
    setHasChanges(false);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const sf = (key) => (e) => setSearch((s) => ({ ...s, [key]: e.target.value }));
  const handleSearch = () => load(search);

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
        await Promise.all(existing.map((r) => clientApi.delete(r.id)));
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
      field: 'clientCode', headerName: '거래처코드 *', width: 130,
      editable: (params) => !!params.data._isNew,
      cellEditorParams: { maxLength: 20 },
    },
    {
      field: 'clientName', headerName: '거래처명 *', flex: 1, editable: true,
      cellEditorParams: { maxLength: 100 },
    },
    {
      field: 'clientType', headerName: '유형', width: 80, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['매출', '매입'] },
    },
    {
      field: 'bizNo', headerName: '사업자번호', width: 130, editable: true,
      cellEditorParams: { maxLength: 12 },
      valueParser: (p) => p.newValue.replace(/[^0-9]/g, '').slice(0, 10),
      valueFormatter: (p) => {
        const digits = (p.value || '').replace(/[^0-9]/g, '');
        return digits.length === 10 ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}` : (p.value || '');
      },
    },
    {
      field: 'tel', headerName: '전화번호', width: 130, editable: true,
      cellEditorParams: { maxLength: 20 },
    },
    { field: 'zipCode', headerName: '우편번호', width: 90, editable: true },
    {
      field: 'address', headerName: '주소', flex: 1, editable: true,
      cellEditorParams: { maxLength: 200 },
    },
    {
      field: 'addressDetail', headerName: '상세주소', flex: 1, editable: true,
      cellEditorParams: { maxLength: 100 },
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
  ], []);

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">거래처관리</h2>
        <div className="toolbar-btns">
          {isAdmin && <button className="btn btn-primary" onClick={handleAddRow}>행 추가</button>}
          {isAdmin && <button className="btn btn-success" onClick={handleSave} disabled={!hasChanges}>저장</button>}
          {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>삭제</button>}
          <button className="btn btn-secondary" onClick={handleRefresh}>새로고침</button>
        </div>
      </div>

      <div className="search-bar">
        <label>거래처명</label>
        <input
          value={search.clientName}
          onChange={sf('clientName')}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="거래처명 검색"
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
