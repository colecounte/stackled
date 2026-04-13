import {
  classifyTrend,
  calcTrendPercent,
  gradeFromDownloads,
  buildDownloadTrendEntry,
  analyzeDownloadTrends,
  summarizeDownloadTrends,
} from './dependency-download-trends';
import { PackageInfo } from '../types';

function makePkg(name: string): PackageInfo {
  return { name, currentVersion: '1.0.0', latestVersion: '1.0.0', description: '' } as PackageInfo;
}

describe('classifyTrend', () => {
  it('returns rising when weekly rate exceeds monthly by >10%', () => {
    expect(classifyTrend(30000, 100000)).toBe('rising');
  });

  it('returns declining when weekly rate is below monthly by >10%', () => {
    expect(classifyTrend(20000, 100000)).toBe('declining');
  });

  it('returns stable when within 10% band', () => {
    expect(classifyTrend(25000, 100000)).toBe('stable');
  });

  it('returns unknown when downloads are zero', () => {
    expect(classifyTrend(0, 0)).toBe('unknown');
    expect(classifyTrend(0, 100000)).toBe('unknown');
  });
});

describe('calcTrendPercent', () => {
  it('calculates positive percent for rising', () => {
    expect(calcTrendPercent(30000, 100000)).toBe(20);
  });

  it('calculates negative percent for declining', () => {
    expect(calcTrendPercent(20000, 100000)).toBe(-20);
  });

  it('returns 0 when monthly is zero', () => {
    expect(calcTrendPercent(1000, 0)).toBe(0);
  });
});

describe('gradeFromDownloads', () => {
  it('grades A for >= 1M weekly', () => expect(gradeFromDownloads(1_000_000)).toBe('A'));
  it('grades B for >= 100K weekly', () => expect(gradeFromDownloads(500_000)).toBe('B'));
  it('grades C for >= 10K weekly', () => expect(gradeFromDownloads(50_000)).toBe('C'));
  it('grades D for >= 1K weekly', () => expect(gradeFromDownloads(5_000)).toBe('D'));
  it('grades F below 1K weekly', () => expect(gradeFromDownloads(500)).toBe('F'));
});

describe('buildDownloadTrendEntry', () => {
  it('builds a complete entry', () => {
    const pkg = makePkg('lodash');
    const entry = buildDownloadTrendEntry(pkg, 2_000_000, 7_000_000);
    expect(entry.name).toBe('lodash');
    expect(entry.grade).toBe('A');
    expect(entry.trend).toBeDefined();
  });
});

describe('analyzeDownloadTrends', () => {
  it('maps packages to entries using stats map', () => {
    const pkgs = [makePkg('react'), makePkg('vue')];
    const stats = new Map([
      ['react', { weekly: 5_000_000, monthly: 18_000_000 }],
      ['vue', { weekly: 500_000, monthly: 2_000_000 }],
    ]);
    const results = analyzeDownloadTrends(pkgs, stats);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('react');
    expect(results[1].name).toBe('vue');
  });

  it('falls back to zeros for missing stats', () => {
    const pkgs = [makePkg('unknown-pkg')];
    const results = analyzeDownloadTrends(pkgs, new Map());
    expect(results[0].weeklyDownloads).toBe(0);
    expect(results[0].trend).toBe('unknown');
  });
});

describe('summarizeDownloadTrends', () => {
  it('counts trends correctly', () => {
    const entries = [
      { trend: 'rising' },
      { trend: 'rising' },
      { trend: 'stable' },
      { trend: 'declining' },
      { trend: 'unknown' },
    ] as any[];
    const summary = summarizeDownloadTrends(entries);
    expect(summary.total).toBe(5);
    expect(summary.rising).toBe(2);
    expect(summary.stable).toBe(1);
    expect(summary.declining).toBe(1);
    expect(summary.unknown).toBe(1);
  });
});
