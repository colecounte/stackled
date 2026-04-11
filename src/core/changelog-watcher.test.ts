import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadWatchList,
  saveWatchList,
  addToWatchList,
  removeFromWatchList,
  checkWatchList,
  WatchEntry,
} from './changelog-watcher';
import * as cacheManager from './cache-manager';

vi.mock('./cache-manager', () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
  getCacheFilePath: vi.fn(),
}));

const mockReadCache = vi.mocked(cacheManager.readCache);
const mockWriteCache = vi.mocked(cacheManager.writeCache);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loadWatchList', () => {
  it('returns empty array when cache is empty', () => {
    mockReadCache.mockReturnValue(null);
    expect(loadWatchList()).toEqual([]);
  });

  it('returns cached entries', () => {
    const entries: WatchEntry[] = [{ name: 'react', version: '18.0.0', addedAt: '2024-01-01' }];
    mockReadCache.mockReturnValue(entries);
    expect(loadWatchList()).toEqual(entries);
  });
});

describe('addToWatchList', () => {
  it('adds a new entry', () => {
    mockReadCache.mockReturnValue([]);
    const result = addToWatchList('lodash', '4.17.21');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
    expect(mockWriteCache).toHaveBeenCalledOnce();
  });

  it('does not duplicate existing entry', () => {
    const existing: WatchEntry[] = [{ name: 'lodash', version: '4.17.21', addedAt: '2024-01-01' }];
    mockReadCache.mockReturnValue(existing);
    const result = addToWatchList('lodash', '4.17.21');
    expect(result).toHaveLength(1);
    expect(mockWriteCache).not.toHaveBeenCalled();
  });
});

describe('removeFromWatchList', () => {
  it('removes an existing entry', () => {
    const existing: WatchEntry[] = [
      { name: 'lodash', version: '4.17.21', addedAt: '2024-01-01' },
      { name: 'react', version: '18.0.0', addedAt: '2024-01-01' },
    ];
    mockReadCache.mockReturnValue(existing);
    const result = removeFromWatchList('lodash');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('react');
  });

  it('returns unchanged list if entry not found', () => {
    const existing: WatchEntry[] = [{ name: 'react', version: '18.0.0', addedAt: '2024-01-01' }];
    mockReadCache.mockReturnValue(existing);
    const result = removeFromWatchList('unknown');
    expect(result).toHaveLength(1);
  });
});

describe('checkWatchList', () => {
  it('returns results for each watched package', async () => {
    const entries: WatchEntry[] = [{ name: 'axios', version: '1.0.0', addedAt: '2024-01-01' }];
    mockReadCache.mockReturnValue(entries);

    const mockFetch = vi.fn().mockResolvedValue({
      latestVersion: '1.1.0',
      entries: [{ version: '1.1.0', changes: ['fix: bug fix'] }],
    });

    const results = await checkWatchList(mockFetch as any);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('axios');
    expect(results[0].latestVersion).toBe('1.1.0');
  });

  it('handles fetch errors gracefully', async () => {
    const entries: WatchEntry[] = [{ name: 'broken', version: '1.0.0', addedAt: '2024-01-01' }];
    mockReadCache.mockReturnValue(entries);
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    const results = await checkWatchList(mockFetch as any);
    expect(results[0].hasNewRelease).toBe(false);
  });
});
