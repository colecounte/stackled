import {
  classifyUpdateType,
  calcDaysSinceUpdate,
  buildUpdateHistoryEntry,
  analyzeUpdateHistory,
  summarizeUpdateHistory,
} from './dependency-update-history';
import { PackageInfo } from '../types';

function makePkg(overrides: Partial<PackageInfo> = {}): PackageInfo {
  return {
    name: 'test-pkg',
    version: '2.0.0',
    description: '',
    time: { modified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    ...overrides,
  } as PackageInfo;
}

describe('classifyUpdateType', () => {
  it('returns major when major version differs', () => {
    expect(classifyUpdateType('2.0.0', '1.9.9')).toBe('major');
  });

  it('returns minor when minor version differs', () => {
    expect(classifyUpdateType('1.2.0', '1.1.5')).toBe('minor');
  });

  it('returns patch when only patch differs', () => {
    expect(classifyUpdateType('1.1.2', '1.1.1')).toBe('patch');
  });

  it('returns unknown for non-semver strings', () => {
    expect(classifyUpdateType('abc', 'def')).toBe('unknown');
  });
});

describe('calcDaysSinceUpdate', () => {
  it('returns approximate days for a recent date', () => {
    const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(calcDaysSinceUpdate(date)).toBe(5);
  });

  it('returns -1 for invalid date string', () => {
    expect(calcDaysSinceUpdate('not-a-date')).toBe(-1);
  });

  it('returns 0 for today', () => {
    expect(calcDaysSinceUpdate(new Date().toISOString())).toBe(0);
  });
});

describe('buildUpdateHistoryEntry', () => {
  it('builds a correct entry', () => {
    const pkg = makePkg();
    const entry = buildUpdateHistoryEntry(pkg, '1.0.0');
    expect(entry.name).toBe('test-pkg');
    expect(entry.currentVersion).toBe('2.0.0');
    expect(entry.previousVersion).toBe('1.0.0');
    expect(entry.updateType).toBe('major');
    expect(entry.isFrequentlyUpdated).toBe(true);
    expect(entry.daysSinceUpdate).toBe(10);
  });

  it('marks isFrequentlyUpdated false when older than 30 days', () => {
    const pkg = makePkg({
      time: { modified: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
    });
    const entry = buildUpdateHistoryEntry(pkg, '1.9.0');
    expect(entry.isFrequentlyUpdated).toBe(false);
  });
});

describe('analyzeUpdateHistory', () => {
  it('filters packages not in the previous version map', () => {
    const pkgs = [makePkg({ name: 'a' }), makePkg({ name: 'b' })];
    const result = analyzeUpdateHistory(pkgs, { a: '1.0.0' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('a');
  });
});

describe('summarizeUpdateHistory', () => {
  it('computes summary correctly', () => {
    const entries = [
      buildUpdateHistoryEntry(makePkg({ name: 'a', version: '2.0.0' }), '1.0.0'),
      buildUpdateHistoryEntry(makePkg({ name: 'b', version: '1.1.0' }), '1.0.0'),
    ];
    const summary = summarizeUpdateHistory(entries);
    expect(summary.total).toBe(2);
    expect(summary.majorUpdates).toBe(1);
    expect(summary.frequentlyUpdated).toBe(2);
    expect(summary.averageDaysSinceUpdate).toBe(10);
  });

  it('handles empty entries', () => {
    const summary = summarizeUpdateHistory([]);
    expect(summary.total).toBe(0);
    expect(summary.averageDaysSinceUpdate).toBe(0);
  });
});
