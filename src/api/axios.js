import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터를 사용하여 요청을 가로채고 토큰을 헤더에 추가합니다.
api.interceptors.request.use((config) => {
  const user = localStorage.getItem('mes_user');
  if (user) {
    const { token } = JSON.parse(user);
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 를 사용하여 응답을 가로채고 에러를 처리합니다.
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 토큰 만료!
      localStorage.removeItem('mes_user');
      alert('세션이 만료됐습니다. 다시 로그인해주세요.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
