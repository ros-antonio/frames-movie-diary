const requiredEnvKeys = ['DATABASE_URL', 'JWT_SECRET'] as const;

function readRequiredEnv(key: typeof requiredEnvKeys[number]): string {
  const value = process.env[key];

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const config = {
  databaseUrl: readRequiredEnv('DATABASE_URL'),
  jwtSecret: readRequiredEnv('JWT_SECRET'),
};
