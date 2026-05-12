import { createApp } from './app.js';
import { prisma } from './repositories/prismaClient.js';
import { config } from './config.js';
import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
import selfsigned from 'selfsigned';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

async function loadHttpsCredentials() {
  if (config.sslKeyPath && config.sslCertPath) {
    return {
      key: readFileSync(config.sslKeyPath),
      cert: readFileSync(config.sslCertPath),
    };
  }

  if (config.sslKeyPath || config.sslCertPath) {
    throw new Error('Both SSL_KEY_PATH and SSL_CERT_PATH must be provided together.');
  }

  if (config.nodeEnv === 'production') {
    throw new Error('Production HTTPS requires SSL_KEY_PATH and SSL_CERT_PATH.');
  }

  const generatedCert = await selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    {
      algorithm: 'sha256',
      keySize: 2048,
      notAfterDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      extensions: [
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            { type: 7, ip: '127.0.0.1' },
          ],
        },
      ],
    },
  );

  console.log('Generated a temporary self-signed HTTPS certificate for local development.');

  return {
    key: generatedCert.private,
    cert: generatedCert.cert,
  };
}

const httpsCredentials = await loadHttpsCredentials();
const server = createServer(httpsCredentials, app).listen(port, '0.0.0.0', () => {
  console.log(`Backend listening over HTTPS on port:${port}`);
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
