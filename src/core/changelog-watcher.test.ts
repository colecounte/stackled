import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addToWatchList,
  removeFromWatchList,
  loadWatchList,
  saveWatchList,
  checkWatchedPackage,
  runWatchCheck,
  WatchedPackage,
} from './changelog-watcher';

vi.mock('./cache-manager', () => ({
  readCache: vi.fn(() => null),
  writeCache: vi.fn(),
}));

vi.mock('./changelog-summarizer', () => ({
  summarizeChangelog: vi.fn(() => ({ highlights: [], securityFixes: false, deprecations: false, totalChanges: 0 })),
}));

import { readCache, writeCache } from './cache-manager';

const mockReadCache = vi.mocked(readCache);
const mockWriteCache = vi.mocked(writeCache);

const makeClient = (overrides: Partial<{ version: string; changelog: string }> = {}) => ({
  getPackageInfo: vi.fn().mockResolvedValue({ version: overrides.version ?? '2.0.0', changelog: overrides.changelog ?? null }),
});

beforeEach(() => {
  vi.clearAllMocks();
  mockReadCache.mockReturnValue(null);
});

describe('addToWatchList', () => {
  it('adds a new package to an empty list', () => {
    mockReadCache.mockReturnValue(null);
    const result = addToWatchList('react', '17.0.0');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('react');
    expect(mockWriteCache).toHaveBeenCalled();
  });

  it('updates existing entry instead of duplicating', () => {
    const existing: WatchedPackage[] = [{ name: 'react', currentVersion: '17.0.0', watchedSince: '2024-01-01T00:00:00.000Z' }];
    mockReadCache.mockReturnValue(existing);
    const result = addToWatchList('react', '18.0.0');
    expect(result).toHaveLength(1);
    expect(result[0].currentVersion).toBe('18.0.0');
  });
});

describe('removeFromWatchList', () => {
  it('removes a package by name', () => {
    const existing: WatchedPackage[] = [
      { name: 'react', currentVersion: '17.0.0', watchedSince: '2024-01-01T00:00:00.000Z' },
      { name: 'lodash', currentVersion: '4.0.0', watchedSince: '2024-01-01T00:00:00.000Z' },
    ];
    mockReadCache.mockReturnValue(existing);
    const result = removeFromWatchList('react');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
  });

  it('returns unchanged list if package not found', () => {
    const existing: WatchedPackage[] = [{ name: 'lodash', currentVersion: '4.0.0', watchedSince: '2024-01-01T00:00:00.000Z' }];
    mockReadCache.mockReturnValue(existing);
    const result = removeFromWatchList('unknown');
    expect(result).toHaveLength(1);
  });
});

describe('checkWatchedPackage', () => {
  it('detects an update and returns result', async () => {
    const client = makeClient({ version: '2.0.0' }) as any;
    const watched: WatchedPackage = { name: 'react', currentVersion: '1.0.0', watchedSince: '' };
    const result = await checkWatchedPackage(client, watched);
    expect(result.hasUpdate).toBe(true);
    expect(result.latestVersion).toBe('2.0.0');
  });

  it('returns cached result if available', async () => {
    const cachedResult = { name: 'react', currentVersion: '1.0.0', latestVersion: '1.0.0', hasUpdate: false, summary: null, checkedAt: '' };
    mockReadCache.mockReturnValue(cachedResult);
    const client = makeClient() as any;
    const watched: WatchedPackage = { name: 'react', currentVersion: '1.0.0', watchedSince: '' };
    const result = await checkWatchedPackage(client, watched);
    expect(result).toBe(cachedResult);
    expect(client.getPackageInfo).not.toHaveBeenCalled();
  });
});

describe('runWatchCheck', () => {
  it('checks all watched packages', async () => {
    const list: WatchedPackage[] = [
      { name: 'react', currentVersion: '17.0.0', watchedSince: '' },
      { name: 'lodash', currentVersion: '4.0.0', watchedSince: '' },
    ];
    mockReadCache.mockReturnValueOnce(list).mockReturnValue(null);
    const client = makeClient({ version: '18.0.0' }) as any;
    const results = await runWatchCheck(client);
    expect(results).toHaveLength(2);
  });
});
