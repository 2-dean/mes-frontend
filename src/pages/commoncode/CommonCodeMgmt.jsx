import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { commonCodeApi } from '../../api/commonCodeApi';
import { useAuth } from '../../context/AuthContext';

ModuleRegistry.registerModules([AllCommunityModule]);

const defaultGroupForm = { groupCode: '', groupName: '', description: '', useYn: 'Y' };

export default function CommonCodeMgmt() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupModal, setGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState(defaultGroupForm);
  const [editGroupId, setEditGroupId] = useState(null);

  const [codes, setCodes] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const gridRef = useRef();

  const loadGroups = useCallback(async () => {
    const r = await commonCodeApi.getGroups();
    setGroups(r.data);
  }, []);

  const loadCodes = useCallback(async (groupId) => {
    const r = await commonCodeApi.getCodes(groupId);
    setCodes(r.data);
    setHasChanges(false);
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleGroupClick = (group) => {
    if (hasChanges && !window.confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?')) return;
    setSelectedGroup(group);
    loadCodes(group.id);
  };

  // ── Group CRUD ────────────────────────────────────────────────────────────

  const openGroupCreate = () => {
    setGroupForm(defaultGroupForm);
    setEditGroupId(null);
    setGroupModal(true);
  };

  const openGroupEdit = (group, e) => {
    e.stopPropagation();
    setGroupForm({
      groupCode: group.groupCode,
      groupName: group.groupName,
      description: group.description || '',
      useYn: group.useYn,
    });
    setEditGroupId(group.id);
    setGroupModal(true);
  };

  const handleGroupSave = async () => {
    if (!groupForm.groupCode || !groupForm.groupName) return alert('그룹코드/그룹명은 필수입니다.');
    try {
      if (editGroupId) await commonCodeApi.updateGroup(editGroupId, groupForm);
      else await commonCodeApi.createGroup(groupForm);
      setGroupModal(false);
      await loadGroups();
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleGroupDelete = async (group, e) => {
    e.stopPropagation();
    if (!window.confirm(`'${group.groupName}' 그룹을 삭제하시겠습니까?\n세부코드도 함께 삭제됩니다.`)) return;
    try {
      await commonCodeApi.deleteGroup(group.id);
      if (selectedGroup?.id === group.id) { setSelectedGroup(null); setCodes([]); }
      await loadGroups();
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // ── Detail code CRUD (inline) ─────────────────────────────────────────────

  const handleAddCode = () => {
    const maxSort = codes.reduce((m, r) => Math.max(m, r.sortOrder || 0), 0);
    const newIndex = codes.length;
    const newRow = {
      _rowId: `_new_${Date.now()}`,
      _isNew: true,
      sortOrder: maxSort + 1,
      code: '', codeName: '', description: '', useYn: 'Y',
    };
    setCodes((prev) => [...prev, newRow]);
    setHasChanges(true);
    setTimeout(() => {
      gridRef.current?.api?.ensureIndexVisible(newIndex, 'bottom');
      gridRef.current?.api?.startEditingCell({ rowIndex: newIndex, colKey: 'code' });
    }, 100);
  };

  const handleCodeSave = async () => {
    gridRef.current.api.stopEditing();
    const allRows = [];
    gridRef.current.api.forEachNode((node) => allRows.push(node.data));

    const newRows = allRows.filter((r) => r._isNew);
    const dirtyRows = allRows.filter((r) => !r._isNew && r._isDirty);

    if (!newRows.length && !dirtyRows.length) return alert('변경된 내용이 없습니다.');
    if ([...newRows, ...dirtyRows].some((r) => !r.code || !r.codeName)) {
      return alert('코드/코드명은 필수입니다.');
    }

    try {
      await Promise.all([
        ...newRows.map(({ _rowId, _isNew, ...data }) => commonCodeApi.createCode(selectedGroup.id, data)),
        ...dirtyRows.map(({ _isDirty, ...data }) => commonCodeApi.updateCode(data.id, data)),
      ]);
      await loadCodes(selectedGroup.id);
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleCodeDelete = async () => {
    const selected = gridRef.current.api.getSelectedRows();
    if (!selected.length) return alert('삭제할 행을 선택하세요.');
    if (!window.confirm(`${selected.length}건을 삭제하시겠습니까?`)) return;

    const existing = selected.filter((r) => !r._isNew);
    const unsaved = selected.filter((r) => r._isNew);

    try {
      if (existing.length) {
        await Promise.all(existing.map((r) => commonCodeApi.deleteCode(r.id)));
        await loadCodes(selectedGroup.id);
      } else {
        const ids = new Set(unsaved.map((r) => r._rowId));
        setCodes((prev) => prev.filter((r) => !r._isNew || !ids.has(r._rowId)));
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCodeRefresh = () => {
    if (hasChanges && !window.confirm('저장하지 않은 변경사항이 있습니다. 새로고침하시겠습니까?')) return;
    loadCodes(selectedGroup.id);
  };

  // ── Grid config ───────────────────────────────────────────────────────────

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
      field: 'sortOrder', headerName: '정렬', width: 70, editable: true,
      valueParser: (p) => Number(p.newValue) || 0,
    },
    {
      field: 'code', headerName: '코드 *', width: 120,
      editable: (params) => !!params.data._isNew,
    },
    { field: 'codeName', headerName: '코드명 *', width: 150, editable: true },
    { field: 'description', headerName: '설명', flex: 1, editable: true },
    {
      field: 'useYn', headerName: '사용여부', width: 90, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['Y', 'N'] },
    },
  ], []);

  const gf = (key) => (e) => setGroupForm({ ...groupForm, [key]: e.target.value });

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">공통코드관리</h2>
      </div>

      <div className="code-layout">
        {/* ── 좌측: 그룹코드 목록 ─────────────────── */}
        <div className="code-group-panel">
          <div className="code-group-header">
            <span>그룹코드</span>
            {isAdmin && <button className="btn btn-primary btn-sm" onClick={openGroupCreate}>+ 추가</button>}
          </div>
          <div className="code-group-list">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`code-group-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
                onClick={() => handleGroupClick(group)}
              >
                <div className="code-group-info">
                  <span className="code-group-code">{group.groupCode}</span>
                  <span className="code-group-name">{group.groupName}</span>
                </div>
                {isAdmin && (
                  <div className="code-group-actions">
                    <button onClick={(e) => openGroupEdit(group, e)} title="수정">✏</button>
                    <button onClick={(e) => handleGroupDelete(group, e)} title="삭제">✕</button>
                  </div>
                )}
              </div>
            ))}
            {groups.length === 0 && (
              <div className="code-group-empty">등록된 그룹코드가 없습니다.</div>
            )}
          </div>
        </div>

        {/* ── 우측: 세부코드 목록 ─────────────────── */}
        <div className="code-detail-panel">
          {selectedGroup ? (
            <>
              <div className="code-detail-toolbar">
                <span className="code-detail-title">
                  {selectedGroup.groupCode} · {selectedGroup.groupName}
                </span>
                <div className="toolbar-btns">
                  {isAdmin && <button className="btn btn-primary" onClick={handleAddCode}>행 추가</button>}
                  {isAdmin && <button className="btn btn-success" onClick={handleCodeSave} disabled={!hasChanges}>저장</button>}
                  {isAdmin && <button className="btn btn-danger" onClick={handleCodeDelete}>삭제</button>}
                  <button className="btn btn-secondary" onClick={handleCodeRefresh}>새로고침</button>
                </div>
              </div>
              <div className="ag-theme-alpine code-detail-grid">
                <AgGridReact
                  ref={gridRef}
                  rowData={codes}
                  columnDefs={colDefs}
                  rowSelection="multiple"
                  getRowId={getRowId}
                  onCellValueChanged={onCellValueChanged}
                  rowClassRules={rowClassRules}
                  singleClickEdit
                  stopEditingWhenCellsLoseFocus
                />
              </div>
            </>
          ) : (
            <div className="code-detail-empty">좌측에서 그룹코드를 선택하세요.</div>
          )}
        </div>
      </div>

      {/* ── 그룹코드 모달 ──────────────────────────── */}
      {groupModal && (
        <div className="modal-overlay" onClick={() => setGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editGroupId ? '그룹코드 수정' : '그룹코드 추가'}</h3>
              <button className="modal-close" onClick={() => setGroupModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>그룹코드 *</label>
                <input value={groupForm.groupCode} onChange={gf('groupCode')} disabled={!!editGroupId} placeholder="CD001" />
              </div>
              <div className="form-row">
                <label>그룹명 *</label>
                <input value={groupForm.groupName} onChange={gf('groupName')} placeholder="단위" />
              </div>
              <div className="form-row">
                <label>설명</label>
                <input value={groupForm.description} onChange={gf('description')} />
              </div>
              <div className="form-row">
                <label>사용여부</label>
                <select value={groupForm.useYn} onChange={gf('useYn')}>
                  <option value="Y">Y</option>
                  <option value="N">N</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleGroupSave}>저장</button>
              <button className="btn btn-secondary" onClick={() => setGroupModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
