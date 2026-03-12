import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket.js';
const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_URL = process.env.CLIENT_URL;
const isProd = process.env.NODE_ENV === 'production';
const corsOrigin = isProd ? (CLIENT_URL ?? '*') : 'http://localhost:5173';
const httpServer = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
    }
    res.writeHead(404);
    res.end();
});
const io = new Server(httpServer, {
    cors: { origin: corsOrigin },
});
setupSocketHandlers(io);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Skull King server running on port ${PORT}`);
});
