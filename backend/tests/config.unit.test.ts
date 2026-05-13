import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

async function importConfigWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.doMock('../src/env.js', () => ({}));
  process.env = {
    ...originalEnv,
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://frames_user:frames_pass@localhost:5432/frames_dev',
    JWT_SECRET: 'test-secret',
    ...env,
  };

  return import('../src/config.js');
}

describe('config', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('reads defaults for optional values', async () => {
    const { config } = await importConfigWithEnv({});

    expect(config.sessionIdleTimeoutMinutes).toBe(15);
    expect(config.sslHosts).toEqual([]);
    expect(config.authIssuer).toBe('Frames Movie Diary');
    expect(config.exposeRecoveryTokens).toBe(true);
  });

  it('parses optional numeric and list environment variables', async () => {
    const { config } = await importConfigWithEnv({
      SESSION_IDLE_TIMEOUT_MINUTES: '30',
      SSL_HOSTS: ' 192.168.0.10, localhost , api.local ',
      AUTH_ISSUER: 'Custom Issuer',
      EXPOSE_RECOVERY_TOKENS: 'false',
      NODE_ENV: 'production',
    });

    expect(config.sessionIdleTimeoutMinutes).toBe(30);
    expect(config.sslHosts).toEqual(['192.168.0.10', 'localhost', 'api.local']);
    expect(config.authIssuer).toBe('Custom Issuer');
    expect(config.exposeRecoveryTokens).toBe(false);
  });

  it('throws when a required environment variable is missing', async () => {
    await expect(importConfigWithEnv({ DATABASE_URL: '   ' })).rejects.toThrow(
      'Missing required environment variable: DATABASE_URL',
    );
  });

  it('throws when optional numeric environment variables are invalid', async () => {
    await expect(importConfigWithEnv({ SESSION_IDLE_TIMEOUT_MINUTES: '0' })).rejects.toThrow(
      'Environment variable SESSION_IDLE_TIMEOUT_MINUTES must be a positive number',
    );
  });

  it('refuses test mode when the database is not a test database', async () => {
    await expect(importConfigWithEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://frames_user:frames_pass@localhost:5432/frames_dev',
    })).rejects.toThrow('Refusing to run test-mode backend against a non-test database');
  });
});
