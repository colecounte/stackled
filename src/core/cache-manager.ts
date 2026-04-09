import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CACHE_DIR = path.join(os.homedir(), '.stackled', 'cache');
const DEFAULT_TTL_MS = 1000 * 60 * 60; // 1 hour

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function getCacheFilePath(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

export function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function writeCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL_MS): void {
  ensureCacheDir();
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };
  fs.writeFileSync(getCacheFilePath(key), JSON.stringify(entry, null, 2), 'utf-8');
}

export function readCache<T>(key: string): T | null {
  const filePath = getCacheFilePath(key);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(raw);
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      fs.unlinkSync(filePath);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function clearCache(key?: string): void {
  if (key) {
    const filePath = getCacheFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }
  if (fs.existsSync(CACHE_DIR)) {
    for (const file of fs.readdirSync(CACHE_DIR)) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }
  }
}

export function isCached(key: string): boolean {
  return readCache(key) !== null;
}
