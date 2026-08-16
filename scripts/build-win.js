/**
 * Windows packaging entry point.
 *
 * Cross-platform note: building a Windows NSIS .exe on macOS requires Wine
 * (see https://www.electron.build/multi-platform-build.html) or you must run
 * this script on a Windows machine / Windows CI runner (e.g. GitHub Actions
 * windows-latest). It will not produce a valid installer on Mac without Wine.
 */
import { execSync } from 'node:child_process';
import { platform } from 'node:os';

const isWin = platform() === 'win32';
const isMac = platform() === 'darwin';

if (isMac) {
  console.warn(`
⚠️  Windows installer build on macOS
   electron-builder can target Windows from Mac only if Wine is installed.
   Without Wine, run "npm run build:win" on Windows or use Windows CI.
   Docs: https://www.electron.build/multi-platform-build.html
`);
}

if (!isWin && !isMac) {
  console.warn(`
⚠️  Windows NSIS builds are best run on Windows or macOS (with Wine).
`);
}

try {
  execSync('npm run build:app', { stdio: 'inherit' });
  execSync('npx electron-builder --win', { stdio: 'inherit' });
} catch (err) {
  process.exit(err.status ?? 1);
}
