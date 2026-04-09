import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  writeCache,
  readCache,
  clearCache,
  isCached,
  getCacheFilePath,
  CacheEntry,
} from './cache-manager';

const CACHE_DIR = path.join(os.homedir(), '.stackled', 'cache');

beforeEach(() => {
  clearCache();
});

afterAll(() => {
  clearCache();
});

describe('getCacheFilePath', () => {
  it('should replace special characters with underscores', () => {
    const filePath = getCacheFilePath('lodash@4.17.21');
    expect(filePath).toContain('lodash_4_17_21');
  });

  it('should return a path inside the cache directory', () => {
    const filePath = getCacheFilePath('react');
    expect(filePath).toContain(CACHE_DIR);
  });
});

describe('writeCache and readCache', () => {
  it('should write and read back data correctly', () => {
    const data = { version: '1.0.0', changelog: 'Initial release' };
    writeCache('test-pkg', data);
    const result = readCache<typeof data>('test-pkg');
    expect(result).toEqual(data);
  });

  it('should return null for non-existent cache keys', () => {
    const result = readCache('non-existent-key');
    expect(result).toBeNull();
  });

  it('should return null for expired cache entries', () => {
    const data = { foo: 'bar' };
    writeCache('expiring-key', data, -1); // TTL of -1ms means already expired
    const result = readCache('expiring-key');
    expect(result).toBeNull();
  });

  it('should return null and not throw for corrupted cache files', () => {
    const filePath = getCacheFilePath('corrupt-key');
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(filePath, 'not-valid-json', 'utf-8');
    const result = readCache('corrupt-key');
    expect(result).toBeNull();
  });
});

describe('clearCache', () => {
  it('should clear a specific cache entry', () => {
    writeCache('to-clear', { a: 1 });
    clearCache('to-clear');
    expect(readCache('to-clear')).toBeNull();
  });

  it('should clear all cache entries when no key is provided', () => {
    writeCache('key1', { a: 1 });
    writeCache('key2', { b: 2 });
    clearCache();
    expect(readCache('key1')).toBeNull();
    expect(readCache('key2')).toBeNull();
  });
});

describe('isCached', () => {
  it('should return true for a valid cached entry', () => {
    writeCache('exists', { data: true });
    expect(isCached('exists')).toBe(true);
  });

  it('should return false for a missing or expired entry', () => {
    expect(isCached('missing')).toBe(false);
  });
});
