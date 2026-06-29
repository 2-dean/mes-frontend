import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-title">MES 생산관리시스템</span>
      </div>
      <div className="header-right">
        <span className="header-user">
          <span className="user-icon">👤</span>
          {user?.username}
        </span>
        <button className="btn-logout" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
