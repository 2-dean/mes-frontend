import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// command: 'serve'(로컬 dev 서버 실행) vs 'build'(운영 빌드)로 환경을 구분
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    // 프록시는 로컬 개발 서버에서만 사용한다.
    // 운영(Vercel) 배포 시에는 vite dev server가 아니라 정적 빌드 결과물이 서빙되므로
    // 이 proxy 설정이 적용되지 않고, 대신 axios.js의 VITE_API_URL(baseURL)로 백엔드에 직접 요청한다.
    proxy: command === 'serve'
      ? {
          '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true,
          },
        }
      : undefined,
  },
}));
