# Skull King Client

React + TypeScript + Vite 클라이언트

## 로컬 실행

```bash
npm install
npm run dev
```

개발 시 기본값으로 `http://localhost:3000` 서버에 연결됩니다.

## Vercel 배포

### 1. Vercel 대시보드 설정

- **Root Directory**: `client` (모노레포인 경우) 또는 프로젝트 루트
- **Build Command**: `npm run build`
- **Output Directory**: `dist` (Vite 기본값)

### 2. 환경변수

| 변수 | 설명 |
|------|------|
| `VITE_SERVER_URL` | 서버 URL (예: `https://your-server.onrender.com`) |

### 3. 배포 후

배포된 클라이언트는 `VITE_SERVER_URL`로 지정한 서버와 WebSocket으로 연결됩니다.
