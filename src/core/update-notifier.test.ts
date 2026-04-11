import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentCliVersion,
  isSelfUpdateDue,
  checkSelfUpdate,
  getUpdateCommand,
  SelfUpdateInfo,
} from './update-notifier';

vi.mock('./cache-manager', () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
}));

import { readCache, writeCache } from './cache-manager';

const mockReadCache = vi.mocked(readCache);
const mockWriteCache = vi.mocked(writeCache);

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCurrentCliVersion', () => {
  it('returns a semver string', () => {
    const version = getCurrentCliVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('isSelfUpdateDue', () => {
  it('returns true when info is null', () => {
    expect(isSelfUpdateDue(null)).toBe(true);
  });

  it('returns false when checked recently', () => {
    const info: SelfUpdateInfo = {
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      isOutdated: false,
      checkedAt: new Date().toISOString(),
    };
    expect(isSelfUpdateDue(info)).toBe(false);
  });

  it('returns true when check is older than 24h', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const info: SelfUpdateInfo = {
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      isOutdated: false,
      checkedAt: old,
    };
    expect(isSelfUpdateDue(info)).toBe(true);
  });
});

describe('checkSelfUpdate', () => {
  it('returns cached result when still fresh', async () => {
    const cached: SelfUpdateInfo = {
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      isOutdated: true,
      checkedAt: new Date().toISOString(),
    };
    mockReadCache.mockResolvedValue(cached);
    const result = await checkSelfUpdate();
    expect(result).toEqual(cached);
    expect(mockWriteCache).not.toHaveBeenCalled();
  });

  it('fetches and caches when cache is stale', async () => {
    mockReadCache.mockResolvedValue(null);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.0.0' }),
    });
    const result = await checkSelfUpdate();
    expect(result.latestVersion).toBe('2.0.0');
    expect(mockWriteCache).toHaveBeenCalled();
  });
});

describe('getUpdateCommand', () => {
  it('returns a non-empty install command string', () => {
    const cmd = getUpdateCommand();
    expect(cmd).toMatch(/stackled/);
  });
});
