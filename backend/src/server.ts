import { createApp } from './app.js';
import { prisma } from './repositories/prismaClient.js';
import { config } from './config.js';
import { createServer } from 'node:https';
import { createServer as createHttpServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
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
    return null;
  }

  const detectedHosts = new Set(['localhost', '127.0.0.1', ...config.sslHosts]);
  const altNames: Array<{ type: 2; value: string } | { type: 7; ip: string }> = [];

  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (name) {
      detectedHosts.add(name);
    }

    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        detectedHosts.add(address.address);
      }
    }
  }

  for (const host of detectedHosts) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      altNames.push({ type: 7, ip: host });
    } else {
      altNames.push({ type: 2, value: host });
    }
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
          altNames,
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
const server = httpsCredentials
  ? createServer(httpsCredentials, app).listen(port, '0.0.0.0', () => {
    console.log(`Backend listening over HTTPS on port:${port}`);
  })
  : createHttpServer(app).listen(port, '0.0.0.0', () => {
    console.log(`Backend listening over HTTP on port:${port} behind an external TLS terminator.`);
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
