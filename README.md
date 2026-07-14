# MES 프론트엔드

MES(제조실행시스템) 포트폴리오 프로젝트의 프론트엔드입니다.
백엔드 저장소: [mes-project](https://github.com/2-dean/mes-project)

## 배포 URL
https://mes-frontend-zoyo.vercel.app

## 테스트 계정
| 구분 | 아이디 | 비밀번호 |
| --- | --- | --- |
| 관리자 | admin | admin123 |
| 게스트 | guest | guest123 |

## 기술스택
React, React Router, AG Grid, Chart.js, axios, Vite

## 주요 기능
- 기준정보 관리 (품목, 거래처)
- 작업지시 관리 (등록, 작업시작, 작업마감)
- 생산실적 입력 (바코드 스캔, 수동입력)
- 작업실적현황 및 일마감
- 인센티브 계산
- JWT 기반 로그인/권한 관리
- 공통코드 관리
- 사용자 관리

## 개발 환경 설정
```bash
npm install
npm run dev
```

`/api` 요청은 로컬 개발 시 `vite.config.js`의 proxy를 통해 `http://localhost:8080`으로 전달됩니다.
운영 배포 시에는 `VITE_API_URL` 환경변수로 백엔드 주소를 지정합니다.

## AI 활용
본 프로젝트는 개발 과정에서 AI(Claude Code)를 적극 활용했습니다.
