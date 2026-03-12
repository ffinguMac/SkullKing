# Skull King Server

Node + TypeScript + Socket.IO 서버

**구조**: 프론트는 Vercel, 서버는 Docker(또는 Render)로 배포.

## 로컬 실행

```bash
npm install
npm run dev
```

## Docker 로컬 테스트

```bash
docker compose up --build
```

브라우저/클라이언트에서 `http://localhost:3000` 사용.

## Docker 프로덕션 실행

```bash
docker build -t skullking-server .
docker run -d --name skullking-server -p 3000:3000 \
  -e PORT=3000 \
  -e CLIENT_URL=https://YOUR-CLIENT.vercel.app \
  skullking-server
```

**CORS 안전**: `CLIENT_URL`을 반드시 Vercel 도메인(예: `https://your-app.vercel.app`)으로 설정하세요.

## Cloudflare Tunnel로 친구 초대하는 방법

서버를 로컬에서 실행한 뒤, Cloudflare Quick Tunnel로 외부 URL을 발급해 친구에게 공유합니다.

### 1. cloudflared 설치

- **Windows**: `winget install cloudflare.cloudflared` 또는 [공식 설치 가이드](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
- **macOS**: `brew install cloudflared`
- **Linux**: [공식 설치 가이드](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

### 2. 실행 순서

1. 서버 실행: `npm run dev`
2. 다른 터미널에서 터널 실행: `npm run dev:tunnel`
3. 터미널에 출력된 `https://xxx.trycloudflare.com` URL을 친구에게 공유

또는 한 번에: `npm run dev:all` (서버 + 터널 동시 실행)

### 3. 프론트 연결

- **프론트가 로컬**: `VITE_SERVER_URL`을 터널 URL로 설정 (예: `https://xxx.trycloudflare.com`)
- **프론트가 Vercel**: 서버만 터널합니다. Vercel 프론트에서 터널 URL을 쓰려면 `VITE_SERVER_URL` 환경변수를 터널 URL로 바꾼 뒤 재배포해야 합니다.

## Render 배포

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **환경변수**: `CLIENT_URL`, `PORT` (자동)
