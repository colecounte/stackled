import {
  parseMaintainers,
  calcDaysSince,
  buildMaintainerStatus,
  checkMaintainers,
  ABANDONED_THRESHOLD_DAYS,
} from './maintainer-checker';
import { PackageInfo } from '../types';

const mockPackage = (name: string): PackageInfo => ({
  name,
  currentVersion: '1.0.0',
  latestVersion: '1.0.0',
  type: 'dependency',
});

describe('parseMaintainers', () => {
  it('parses valid maintainer objects', () => {
    const raw = [{ name: 'Alice', email: 'alice@example.com' }, { name: 'Bob' }];
    const result = parseMaintainers(raw);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
    expect(result[0].email).toBe('alice@example.com');
    expect(result[1].email).toBeUndefined();
  });

  it('returns empty array for non-array input', () => {
    expect(parseMaintainers(null as unknown as unknown[])).toEqual([]);
    expect(parseMaintainers('bad' as unknown as unknown[])).toEqual([]);
  });

  it('skips non-object entries', () => {
    const raw = [{ name: 'Alice' }, 'bad', null, 42];
    const result = parseMaintainers(raw as unknown[]);
    expect(result).toHaveLength(1);
  });
});

describe('calcDaysSince', () => {
  it('returns null for null input', () => {
    expect(calcDaysSince(null)).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(calcDaysSince('not-a-date')).toBeNull();
  });

  it('returns a non-negative number for a past date', () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const days = calcDaysSince(pastDate);
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThanOrEqual(11);
  });
});

describe('buildMaintainerStatus', () => {
  it('marks package as abandoned when over threshold', () => {
    const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    const status = buildMaintainerStatus('pkg', [], oldDate);
    expect(status.isAbandoned).toBe(true);
    expect(status.abandonedThresholdDays).toBe(ABANDONED_THRESHOLD_DAYS);
  });

  it('does not mark package as abandoned when recent', () => {
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const status = buildMaintainerStatus('pkg', [], recentDate);
    expect(status.isAbandoned).toBe(false);
  });

  it('does not mark as abandoned when lastPublish is null', () => {
    const status = buildMaintainerStatus('pkg', [], null);
    expect(status.isAbandoned).toBe(false);
    expect(status.daysSincePublish).toBeNull();
  });

  it('respects custom threshold', () => {
    const date = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const status = buildMaintainerStatus('pkg', [], date, 90);
    expect(status.isAbandoned).toBe(true);
  });
});

describe('checkMaintainers', () => {
  it('returns a status entry per package', () => {
    const packages = [mockPackage('react'), mockPackage('lodash')];
    const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    const registryData = {
      react: { maintainers: [{ name: 'Meta' }], time: { modified: new Date().toISOString() } },
      lodash: { maintainers: [], time: { modified: oldDate } },
    };
    const results = checkMaintainers(packages, registryData);
    expect(results).toHaveLength(2);
    expect(results[0].packageName).toBe('react');
    expect(results[0].isAbandoned).toBe(false);
    expect(results[1].packageName).toBe('lodash');
    expect(results[1].isAbandoned).toBe(true);
  });

  it('handles missing registry data gracefully', () => {
    const packages = [mockPackage('unknown-pkg')];
    const results = checkMaintainers(packages, {});
    expect(results[0].maintainers).toEqual([]);
    expect(results[0].lastPublish).toBeNull();
    expect(results[0].isAbandoned).toBe(false);
  });
});
