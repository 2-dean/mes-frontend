import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { userApi } from '../../api/userApi';

ModuleRegistry.registerModules([AllCommunityModule]);

const defaultRegForm = { username: '', password: '', name: '', role: 'USER' };
const defaultEditForm = { name: '', role: 'USER', useYn: 'Y' };
const defaultPwForm = { newPassword: '' };

export default function UserMgmt() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [regModal, setRegModal] = useState(false);
  const [regForm, setRegForm] = useState(defaultRegForm);

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(defaultEditForm);

  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState(defaultPwForm);

  const gridRef = useRef();

  const load = useCallback(async () => {
    try {
      const r = await userApi.getAll();
      setRows(r.data);
      setSelected(null);
    } catch (e) {
      console.error('사용자 목록 조회 실패:', e);
      alert(`조회 실패: ${e.response?.status} ${e.response?.data?.message || e.message}`);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSelectionChanged = useCallback(() => {
    const sel = gridRef.current?.api?.getSelectedRows();
    setSelected(sel?.length === 1 ? sel[0] : null);
  }, []);

  // ── 등록 ──────────────────────────────────────────
  const openReg = () => {
    setRegForm(defaultRegForm);
    setRegModal(true);
  };

  const handleReg = async () => {
    if (!regForm.username || !regForm.password || !regForm.name) {
      return alert('아이디 / 비밀번호 / 이름은 필수입니다.');
    }
    try {
      await userApi.create(regForm);
      setRegModal(false);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || '등록 중 오류가 발생했습니다.');
    }
  };

  // ── 수정 ──────────────────────────────────────────
  const openEdit = () => {
    if (!selected) return alert('수정할 사용자를 선택하세요.');
    setEditForm({ name: selected.name, role: selected.role, useYn: selected.useYn });
    setEditModal(true);
  };

  const handleEdit = async () => {
    if (!editForm.name) return alert('이름은 필수입니다.');
    try {
      await userApi.update(selected.id, editForm);
      setEditModal(false);
      await load();
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  // ── 비밀번호 변경 ──────────────────────────────────
  const openPw = () => {
    if (!selected) return alert('비밀번호를 변경할 사용자를 선택하세요.');
    setPwForm(defaultPwForm);
    setPwModal(true);
  };

  const handlePw = async () => {
    if (!pwForm.newPassword) return alert('새 비밀번호를 입력하세요.');
    try {
      await userApi.changePassword(selected.id, pwForm);
      setPwModal(false);
      alert('비밀번호가 변경되었습니다.');
    } catch {
      alert('비밀번호 변경 중 오류가 발생했습니다.');
    }
  };

  // ── Grid ──────────────────────────────────────────
  const colDefs = useMemo(() => [
    { checkboxSelection: true, width: 50, editable: false },
    { field: 'username', headerName: '아이디', width: 130 },
    { field: 'name', headerName: '이름', width: 120 },
    {
      field: 'role', headerName: '권한', width: 100,
      cellRenderer: (p) => (
        <span style={{
          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
          background: p.value === 'ADMIN' ? '#dbeafe' : '#f0fdf4',
          color: p.value === 'ADMIN' ? '#1d4ed8' : '#15803d',
        }}>
          {p.value}
        </span>
      ),
    },
    {
      field: 'useYn', headerName: '사용여부', width: 90,
      cellRenderer: (p) => (
        <span style={{ color: p.value === 'Y' ? '#15803d' : '#dc2626', fontWeight: 600 }}>
          {p.value === 'Y' ? '사용' : '미사용'}
        </span>
      ),
    },
    { field: 'createdBy', headerName: '등록자', width: 100 },
    {
      field: 'createdAt', headerName: '등록일', width: 150,
      valueFormatter: (p) => p.value ? p.value.replace('T', ' ').substring(0, 16) : '',
    },
    { field: 'updatedBy', headerName: '수정자', width: 100 },
    {
      field: 'updatedAt', headerName: '수정일', flex: 1,
      valueFormatter: (p) => p.value ? p.value.replace('T', ' ').substring(0, 16) : '',
    },
  ], []);

  const rf = (key) => (e) => setRegForm((f) => ({ ...f, [key]: e.target.value }));
  const ef = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  // ADMIN 계정은 강등/비활성화 불가 (화면단 차단)
  const isProtectedAdmin = selected?.role === 'ADMIN';

  return (
    <div className="page-wrap">
      <div className="page-toolbar">
        <h2 className="page-title">사용자관리</h2>
        <div className="toolbar-btns">
          <button className="btn btn-primary" onClick={openReg}>등록</button>
          <button className="btn btn-secondary" onClick={openEdit} disabled={!selected}>수정</button>
          <button className="btn btn-warning" onClick={openPw} disabled={!selected}>비밀번호 변경</button>
          <button className="btn btn-secondary" onClick={load}>새로고침</button>
        </div>
      </div>

      <div className="ag-theme-alpine grid-wrap">
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={colDefs}
          rowSelection="single"
          onSelectionChanged={onSelectionChanged}
          pagination
          paginationPageSize={20}
        />
      </div>

      {/* ── 등록 모달 ── */}
      {regModal && (
        <div className="modal-overlay" onClick={() => setRegModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>사용자 등록</h3>
              <button className="modal-close" onClick={() => setRegModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>아이디 *</label>
                <input value={regForm.username} onChange={rf('username')} placeholder="아이디 입력" />
              </div>
              <div className="form-row">
                <label>비밀번호 *</label>
                <input type="password" value={regForm.password} onChange={rf('password')} placeholder="비밀번호 입력" />
              </div>
              <div className="form-row">
                <label>이름 *</label>
                <input value={regForm.name} onChange={rf('name')} placeholder="이름 입력" />
              </div>
              <div className="form-row">
                <label>권한</label>
                <select value={regForm.role} onChange={rf('role')}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleReg}>저장</button>
              <button className="btn btn-secondary" onClick={() => setRegModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 모달 ── */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>사용자 수정 — {selected?.username}</h3>
              <button className="modal-close" onClick={() => setEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>이름 *</label>
                <input value={editForm.name} onChange={ef('name')} />
              </div>
              <div className="form-row">
                <label>권한</label>
                <select value={editForm.role} onChange={ef('role')} disabled={isProtectedAdmin}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="form-row">
                <label>사용여부</label>
                <select value={editForm.useYn} onChange={ef('useYn')} disabled={isProtectedAdmin}>
                  <option value="Y">사용</option>
                  <option value="N">미사용</option>
                </select>
              </div>
              {isProtectedAdmin && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '4px' }}>
                  관리자(ADMIN) 계정은 권한/사용여부를 변경할 수 없습니다.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleEdit}>저장</button>
              <button className="btn btn-secondary" onClick={() => setEditModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 비밀번호 변경 모달 ── */}
      {pwModal && (
        <div className="modal-overlay" onClick={() => setPwModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>비밀번호 변경 — {selected?.username}</h3>
              <button className="modal-close" onClick={() => setPwModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>새 비밀번호 *</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ newPassword: e.target.value })}
                  placeholder="새 비밀번호 입력"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handlePw}>변경</button>
              <button className="btn btn-secondary" onClick={() => setPwModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
