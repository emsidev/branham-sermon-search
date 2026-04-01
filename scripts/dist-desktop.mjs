import { spawnSync } from 'node:child_process';

const targetScript = process.platform === 'win32' ? 'dist:desktop:win' : 'dist:desktop:wsl';
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  console.error('Unable to resolve npm executable path (npm_execpath is missing).');
  process.exit(1);
}

const result = spawnSync(process.execPath, [npmExecPath, 'run', targetScript], {
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error);
}

process.exit(1);
