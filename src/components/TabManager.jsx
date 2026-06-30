export default function TabManager({ tabs, activeTabId, onTabClick, onTabClose, onCloseAll }) {
  if (tabs.length === 0) return null;

  const hasCloseable = tabs.some((t) => t.id !== 'dashboard');

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {tab.id !== 'dashboard' && (
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {hasCloseable && (
        <button className="tab-close-all" onClick={onCloseAll}>
          전체 닫기
        </button>
      )}
    </div>
  );
}
