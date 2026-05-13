import './env.js';

const requiredEnvKeys = ['DATABASE_URL', 'JWT_SECRET'] as const;

function readRequiredEnv(key: typeof requiredEnvKeys[number]): string {
  const value = process.env[key];

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function readOptionalIntEnv(key: string, fallback: number): number {
  const rawValue = process.env[key];

  if (!rawValue?.trim()) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${key} must be a positive number`);
  }

  return parsed;
}

function readOptionalListEnv(key: string): string[] {
  const rawValue = process.env[key];

  if (!rawValue?.trim()) {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export const config = {
  databaseUrl: readRequiredEnv('DATABASE_URL'),
  jwtSecret: readRequiredEnv('JWT_SECRET'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  sessionIdleTimeoutMinutes: readOptionalIntEnv('SESSION_IDLE_TIMEOUT_MINUTES', 15),
  sslKeyPath: process.env.SSL_KEY_PATH?.trim() || null,
  sslCertPath: process.env.SSL_CERT_PATH?.trim() || null,
  sslHosts: readOptionalListEnv('SSL_HOSTS'),
  authIssuer: process.env.AUTH_ISSUER?.trim() || 'Frames Movie Diary',
  exposeRecoveryTokens: process.env.EXPOSE_RECOVERY_TOKENS?.trim() === 'true' || process.env.NODE_ENV !== 'production',
};

if (config.nodeEnv === 'test' && !config.databaseUrl.includes('_test')) {
  throw new Error(`Refusing to run test-mode backend against a non-test database: ${config.databaseUrl}`);
}
