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

function readOptionalBoolEnv(key: string, fallback: boolean): boolean {
  const rawValue = process.env[key];

  if (!rawValue?.trim()) {
    return fallback;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${key} must be either "true" or "false"`);
}

function readOptionalStringEnv(key: string): string | null {
  const rawValue = process.env[key];
  return rawValue?.trim() || null;
}

export const config = {
  databaseUrl: readRequiredEnv('DATABASE_URL'),
  jwtSecret: readRequiredEnv('JWT_SECRET'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  sessionIdleTimeoutMinutes: readOptionalIntEnv('SESSION_IDLE_TIMEOUT_MINUTES', 15),
  sslKeyPath: process.env.SSL_KEY_PATH?.trim() || null,
  sslCertPath: process.env.SSL_CERT_PATH?.trim() || null,
  sslHosts: readOptionalListEnv('SSL_HOSTS'),
  corsAllowedOrigins: readOptionalListEnv('CORS_ALLOWED_ORIGINS'),
  trustProxy: readOptionalBoolEnv('TRUST_PROXY', false),
  authIssuer: process.env.AUTH_ISSUER?.trim() || 'Frames Movie Diary',
  appBaseUrl: readOptionalStringEnv('APP_BASE_URL'),
  smtpHost: readOptionalStringEnv('SMTP_HOST'),
  smtpPort: process.env.SMTP_PORT?.trim() ? readOptionalIntEnv('SMTP_PORT', 587) : null,
  smtpSecure: readOptionalBoolEnv('SMTP_SECURE', false),
  smtpUser: readOptionalStringEnv('SMTP_USER'),
  smtpPass: readOptionalStringEnv('SMTP_PASS'),
  smtpFrom: readOptionalStringEnv('SMTP_FROM'),
  exposeRecoveryTokens: process.env.EXPOSE_RECOVERY_TOKENS?.trim() === 'true' || process.env.NODE_ENV !== 'production',
};

if ((config.smtpUser && !config.smtpPass) || (!config.smtpUser && config.smtpPass)) {
  throw new Error('SMTP_USER and SMTP_PASS must either both be set or both be empty');
}

if (config.nodeEnv === 'test' && !config.databaseUrl.includes('_test')) {
  throw new Error(`Refusing to run test-mode backend against a non-test database: ${config.databaseUrl}`);
}
