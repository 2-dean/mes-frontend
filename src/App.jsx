import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TabManager from './components/TabManager';
import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ItemList from './pages/item/ItemList';
import ClientList from './pages/client/ClientList';
import WorkOrderList from './pages/workorder/WorkOrderList';
import ProdResult from './pages/prodresult/ProdResult';
import DailyClose from './pages/dailyclose/DailyClose';
import Incentive from './pages/incentive/Incentive';

const PAGE_MAP = {
  dashboard: { label: '대시보드', icon: '📊', component: Dashboard },
  item: { label: '품목관리', icon: '📦', component: ItemList },
  client: { label: '거래처관리', icon: '🏢', component: ClientList },
  workorder: { label: '작업지시', icon: '📋', component: WorkOrderList },
  prodresult: { label: '생산실적', icon: '🏭', component: ProdResult },
  dailyclose: { label: '작업실적현황', icon: '📅', component: DailyClose },
  incentive: { label: '인센티브현황', icon: '💰', component: Incentive },
};

function MainLayout() {
  const { user } = useAuth();
  const [tabs, setTabs] = useState([{ id: 'dashboard', ...PAGE_MAP.dashboard }]);
  const [activeTabId, setActiveTabId] = useState('dashboard');

  if (!user) return <Navigate to="/login" replace />;

  const handleMenuClick = (item) => {
    if (!tabs.find((t) => t.id === item.id)) {
      setTabs((prev) => [...prev, { id: item.id, ...PAGE_MAP[item.id] }]);
    }
    setActiveTabId(item.id);
  };

  const handleTabClose = (id) => {
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (activeTabId === id) {
      setActiveTabId(next.length ? next[next.length - 1].id : '');
    }
  };

  const ActiveComponent = PAGE_MAP[activeTabId]?.component;

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar activeTab={activeTabId} onMenuClick={handleMenuClick} />
        <div className="content-area">
          <TabManager
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTabId}
            onTabClose={handleTabClose}
          />
          <div className="page-content">
            {ActiveComponent ? <ActiveComponent /> : (
              <div className="empty-state">메뉴를 선택하세요.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginGuard() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
