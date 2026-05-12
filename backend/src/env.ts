import { config as loadEnvFile } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const nodeEnv = process.env.NODE_ENV ?? 'development';

loadEnvFile({ path: path.join(backendRoot, '.env') });

if (nodeEnv !== 'development') {
  loadEnvFile({
    path: path.join(backendRoot, `.env.${nodeEnv}`),
    override: true,
  });
}
