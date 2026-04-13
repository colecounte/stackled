import {
  gradeFromActivityScore,
  calcActivityScore,
  buildActivityFlags,
  buildActivityEntry,
  checkDependencyActivity,
  summarizeActivity,
} from './dependency-activity-checker';
import { PackageInfo } from '../types';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function makePkg(overrides: Partial<PackageInfo> & Record<string, any> = {}): PackageInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    description: '',
    license: 'MIT',
    dependencies: {},
    lastPublish: daysAgo(30),
    ...overrides,
  } as PackageInfo;
}

describe('gradeFromActivityScore', () => {
  it('returns A for score >= 80', () => expect(gradeFromActivityScore(85)).toBe('A'));
  it('returns B for score >= 65', () => expect(gradeFromActivityScore(70)).toBe('B'));
  it('returns C for score >= 50', () => expect(gradeFromActivityScore(55)).toBe('C'));
  it('returns D for score >= 35', () => expect(gradeFromActivityScore(40)).toBe('D'));
  it('returns F for score < 35', () => expect(gradeFromActivityScore(20)).toBe('F'));
});

describe('calcActivityScore', () => {
  it('starts near 100 for active healthy package', () => {
    const score = calcActivityScore(10, 5, 50, 500);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('penalizes no commits in 2+ years', () => {
    const score = calcActivityScore(800, 10, 50, 200);
    expect(score).toBeLessThanOrEqual(60);
  });

  it('penalizes low issue resolution rate', () => {
    const score = calcActivityScore(10, 90, 10, 500);
    expect(score).toBeLessThan(calcActivityScore(10, 10, 90, 500));
  });

  it('penalizes null lastCommitDaysAgo', () => {
    const score = calcActivityScore(null, null, null, null);
    expect(score).toBeLessThan(50);
  });

  it('clamps score to 0 minimum', () => {
    const score = calcActivityScore(1000, 100, 0, 0);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('buildActivityFlags', () => {
  it('flags no-recent-commits for old commits', () => {
    const flags = buildActivityFlags(400, 0.8, 200);
    expect(flags).toContain('no-recent-commits');
  });

  it('flags low-issue-resolution for low rate', () => {
    const flags = buildActivityFlags(30, 0.1, 200);
    expect(flags).toContain('low-issue-resolution');
  });

  it('flags low-stars for few stars', () => {
    const flags = buildActivityFlags(30, 0.8, 5);
    expect(flags).toContain('low-stars');
  });

  it('returns empty flags for healthy package', () => {
    const flags = buildActivityFlags(30, 0.9, 500);
    expect(flags).toHaveLength(0);
  });
});

describe('buildActivityEntry', () => {
  it('builds entry with computed score and grade', () => {
    const pkg = makePkg({ lastPublish: daysAgo(20), openIssues: 5, closedIssues: 95, stars: 1000 } as any);
    const entry = buildActivityEntry(pkg);
    expect(entry.name).toBe('test-pkg');
    expect(entry.activityScore).toBeGreaterThan(0);
    expect(['A','B','C','D','F']).toContain(entry.activityGrade);
    expect(entry.issueResolutionRate).toBeCloseTo(0.95);
  });

  it('handles missing lastPublish', () => {
    const pkg = makePkg({ lastPublish: undefined } as any);
    const entry = buildActivityEntry(pkg);
    expect(entry.lastCommitDaysAgo).toBeNull();
  });
});

describe('checkDependencyActivity', () => {
  it('returns one entry per package', () => {
    const pkgs = [makePkg({ name: 'a' }), makePkg({ name: 'b' })];
    const results = checkDependencyActivity(pkgs);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.name)).toEqual(['a', 'b']);
  });
});

describe('summarizeActivity', () => {
  it('counts inactive and healthy entries', () => {
    const entries = [
      { ...buildActivityEntry(makePkg()), activityGrade: 'A', activityScore: 90 },
      { ...buildActivityEntry(makePkg()), activityGrade: 'F', activityScore: 10 },
      { ...buildActivityEntry(makePkg()), activityGrade: 'D', activityScore: 38 },
    ];
    const summary = summarizeActivity(entries);
    expect(summary.total).toBe(3);
    expect(summary.healthy).toBe(1);
    expect(summary.inactive).toBe(2);
    expect(summary.averageScore).toBe(46);
  });

  it('handles empty list', () => {
    const summary = summarizeActivity([]);
    expect(summary.total).toBe(0);
    expect(summary.averageScore).toBe(0);
  });
});
