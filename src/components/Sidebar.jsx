import { useAuth } from '../context/AuthContext';

const MENU_ITEMS = [
  { type: 'category', label: '기준정보' },
  { id: 'item', label: '품목관리', icon: '📦' },
  { id: 'client', label: '거래처관리', icon: '🏢' },
  { type: 'category', label: '생산관리' },
  { id: 'workorder', label: '작업지시', icon: '📋' },
  { id: 'prodresult', label: '생산실적', icon: '🏭' },
  { id: 'dailyclose', label: '작업실적현황', icon: '📅' },
  { type: 'category', label: '환경설정' },
  { id: 'commoncode', label: '공통코드관리', icon: '🗂️', adminOnly: true },
  { id: 'user', label: '사용자관리', icon: '👤', adminOnly: true },
];

export default function Sidebar({ activeTab, onMenuClick }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const visibleItems = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => onMenuClick({ id: 'dashboard' })} style={{ cursor: 'pointer' }}>MES</div>
      <nav className="sidebar-nav">
        {visibleItems.map((item, idx) => {
          if (item.type === 'category') {
            return (
              <div key={idx} className="sidebar-category">{item.label}</div>
            );
          }
          return (
            <button
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onMenuClick(item)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
