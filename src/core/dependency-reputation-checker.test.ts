import {
  gradeFromReputationScore,
  calcReputationScore,
  buildReputationFlags,
  buildReputationEntry,
  summarizeReputation,
  ReputationEntry,
} from './dependency-reputation-checker';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version } as PackageInfo;
}

describe('gradeFromReputationScore', () => {
  it('returns A for score >= 80', () => expect(gradeFromReputationScore(85)).toBe('A'));
  it('returns B for score >= 60', () => expect(gradeFromReputationScore(65)).toBe('B'));
  it('returns C for score >= 40', () => expect(gradeFromReputationScore(45)).toBe('C'));
  it('returns D for score >= 20', () => expect(gradeFromReputationScore(25)).toBe('D'));
  it('returns F for score < 20', () => expect(gradeFromReputationScore(10)).toBe('F'));
});

describe('calcReputationScore', () => {
  it('scores high for popular package with many stars', () => {
    const score = calcReputationScore(5_000_000, 50_000, 10);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('scores low for obscure package', () => {
    const score = calcReputationScore(500, 5, 2);
    expect(score).toBeLessThan(30);
  });

  it('penalizes packages with many open issues', () => {
    const scoreWithIssues = calcReputationScore(1_000_000, 10_000, 600);
    const scoreWithoutIssues = calcReputationScore(1_000_000, 10_000, 10);
    expect(scoreWithIssues).toBeLessThan(scoreWithoutIssues);
  });

  it('handles null stars gracefully', () => {
    const score = calcReputationScore(100_000, null, null);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('caps score at 100', () => {
    const score = calcReputationScore(10_000_000, 100_000, 0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('buildReputationFlags', () => {
  it('flags low-downloads when weekly downloads < 1000', () => {
    expect(buildReputationFlags(500, 100)).toContain('low-downloads');
  });

  it('flags low-stars when stars < 10', () => {
    expect(buildReputationFlags(5000, 5)).toContain('low-stars');
  });

  it('flags no-repo-data when stars is null', () => {
    expect(buildReputationFlags(5000, null)).toContain('no-repo-data');
  });

  it('returns empty array for reputable package', () => {
    expect(buildReputationFlags(2_000_000, 20_000)).toHaveLength(0);
  });
});

describe('buildReputationEntry', () => {
  it('builds a complete entry', () => {
    const entry = buildReputationEntry(makePkg('react'), 20_000_000, 200_000, 5_000, 100);
    expect(entry.name).toBe('react');
    expect(entry.grade).toBe('A');
    expect(entry.score).toBeGreaterThan(0);
    expect(entry.flags).toHaveLength(0);
  });

  it('includes flags for low-reputation packages', () => {
    const entry = buildReputationEntry(makePkg('tiny-pkg'), 200, null, null, null);
    expect(entry.flags).toContain('low-downloads');
    expect(entry.flags).toContain('no-repo-data');
  });
});

describe('summarizeReputation', () => {
  const entries: ReputationEntry[] = [
    { name: 'a', version: '1.0.0', weeklyDownloads: 1e6, stars: 5000, forks: 100, openIssues: 10, score: 90, grade: 'A', flags: [] },
    { name: 'b', version: '1.0.0', weeklyDownloads: 500, stars: null, forks: null, openIssues: null, score: 10, grade: 'F', flags: ['no-repo-data'] },
    { name: 'c', version: '1.0.0', weeklyDownloads: 50000, stars: 500, forks: 50, openIssues: 20, score: 60, grade: 'B', flags: [] },
  ];

  it('counts totals correctly', () => {
    const summary = summarizeReputation(entries);
    expect(summary.total).toBe(3);
    expect(summary.highReputation).toBe(2);
    expect(summary.lowReputation).toBe(1);
    expect(summary.unknown).toBe(1);
  });
});
