import { spawn } from 'node:child_process';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendDir, '..');
const backendDir = path.join(repoRoot, 'backend');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const backendPort = '4100';
const frontendPort = '4173';
const playwrightBaseUrl = `https://localhost:${frontendPort}`;
const children = [];
let shuttingDown = false;

function spawnProcess(cwd, args, extraEnv = {}) {
  const child = spawn(npmCommand, args, {
    cwd,
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  process.exit(exitCode);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitForUrl(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = https.get(
        url,
        {
          rejectUnauthorized: false,
        },
        (response) => {
          response.resume();
          resolve(response.statusCode ?? 200);
        },
      );

      request.on('error', async () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        await wait(1000);
        check();
      });
    };

    check();
  });
}

async function main() {
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  const reset = spawn(npmCommand, ['exec', 'prisma', 'migrate', 'reset', '--', '--force'], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  const resetExitCode = await new Promise((resolve) => {
    reset.on('exit', (code) => resolve(code ?? 1));
  });

  if (resetExitCode !== 0) {
    shutdown(resetExitCode);
    return;
  }

  const backend = spawnProcess(backendDir, ['run', 'dev:e2e'], {
    NODE_ENV: 'test',
    PORT: backendPort,
  });
  backend.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) {
      shutdown(code);
    }
  });

  await waitForUrl(`https://localhost:${backendPort}/api/health`);

  const frontend = spawnProcess(frontendDir, ['run', 'dev'], {
    PORT: frontendPort,
    VITE_BACKEND_PORT: backendPort,
    VITE_BACKEND_URL: `https://localhost:${backendPort}`,
  });
  frontend.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) {
      shutdown(code);
    }
  });

  await waitForUrl(playwrightBaseUrl);

  const playwrightArgs = ['exec', 'playwright', 'test', ...process.argv.slice(2)];
  const runner = spawn(npmCommand, playwrightArgs, {
    cwd: frontendDir,
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: playwrightBaseUrl,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  runner.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
