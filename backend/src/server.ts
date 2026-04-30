import { createApp } from './app.js';
import { prisma } from './repositories/prismaClient.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on the Wi-Fi network on port:${port}`);
});

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);