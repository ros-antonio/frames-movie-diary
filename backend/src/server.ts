import { createServer } from 'node:http';
import { createApp } from './app.js';
import { closeMongoClient } from './repositories/mongoClient.js';
import { prisma } from './repositories/prismaClient.js';
import { setupChatWebSocketServer } from './websocket/chatServer.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
const httpServer = createServer(app);
setupChatWebSocketServer(httpServer);

const server = httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on the Wi-Fi network on port:${port}`);
});

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    await closeMongoClient();
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
