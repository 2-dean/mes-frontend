import { createContext, useContext, useState } from 'react';
import api from '../api/axios'; // baseURL(VITE_API_URL)이 적용된 공용 axios 인스턴스 사용

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mes_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    const { token, name, role } = res.data;
    const userData = { username, name, role, token };
    localStorage.setItem('mes_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('mes_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
