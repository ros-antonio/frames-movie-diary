import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initRealtime } from './realtime/wsHub.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
const server = createServer(app);

initRealtime(server);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

