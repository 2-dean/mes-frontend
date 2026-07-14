import axios from 'axios';

// 운영(Vercel) 환경: VITE_API_URL 환경변수로 지정된 백엔드 주소를 baseURL로 사용
// 로컬 개발 환경: VITE_API_URL을 비워두면 baseURL이 빈 문자열이 되어
//                vite.config.js의 devServer proxy(/api → localhost:8080)를 그대로 탄다
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
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
