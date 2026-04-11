import { execSync } from 'child_process';
import { readCache, writeCache } from './cache-manager';

const CACHE_KEY = 'stackled-self-update';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SelfUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isOutdated: boolean;
  checkedAt: string;
}

export function getCurrentCliVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json') as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

export async function fetchLatestCliVersion(): Promise<string> {
  const response = await fetch('https://registry.npmjs.org/stackled/latest');
  if (!response.ok) throw new Error(`Registry error: ${response.status}`);
  const data = (await response.json()) as { version: string };
  return data.version;
}

export function isSelfUpdateDue(info: SelfUpdateInfo | null): boolean {
  if (!info) return true;
  const elapsed = Date.now() - new Date(info.checkedAt).getTime();
  return elapsed > CHECK_INTERVAL_MS;
}

export async function checkSelfUpdate(): Promise<SelfUpdateInfo> {
  const cached = await readCache<SelfUpdateInfo>(CACHE_KEY);
  if (cached && !isSelfUpdateDue(cached)) return cached;

  const currentVersion = getCurrentCliVersion();
  const latestVersion = await fetchLatestCliVersion();
  const isOutdated = latestVersion !== currentVersion;

  const info: SelfUpdateInfo = {
    currentVersion,
    latestVersion,
    isOutdated,
    checkedAt: new Date().toISOString(),
  };

  await writeCache(CACHE_KEY, info);
  return info;
}

export function getUpdateCommand(): string {
  try {
    execSync('npm --version', { stdio: 'ignore' });
    return 'npm install -g stackled';
  } catch {
    return 'yarn global add stackled';
  }
}
