const MENU_ITEMS = [
  { id: 'dashboard', label: '대시보드', icon: '📊' },
  { id: 'item', label: '품목관리', icon: '📦' },
  { id: 'client', label: '거래처관리', icon: '🏢' },
  { id: 'workorder', label: '작업지시', icon: '📋' },
  { id: 'prodresult', label: '생산실적', icon: '🏭' },
  { id: 'dailyclose', label: '작업실적현황', icon: '📅' },
  { id: 'incentive', label: '인센티브현황', icon: '💰' },
];

export default function Sidebar({ activeTab, onMenuClick }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">MES</div>
      <nav className="sidebar-nav">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onMenuClick(item)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
