import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    test: {
      env: {
        ...env,
        DATABASE_URL: env.DATABASE_URL,
        JWT_SECRET: env.JWT_SECRET || 'test_secret_key_for_integration_tests',
      },
      threads: false,
      isolate: false,
      fileParallelism: false,
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.ts'],
        exclude: ['src/server.ts', 'src/types.ts'],
        thresholds: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
  };
});
