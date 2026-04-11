import {
  classifyStaleness,
  calcStalenessScore,
  buildStalenessEntry,
  detectStaleness,
  summarizeStaleness,
} from './staleness-detector';
import { Dependency } from '../types';

function makeDep(name: string, version: string): Dependency {
  return { name, version, type: 'dependency' };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

describe('classifyStaleness', () => {
  it('returns current for recent, no major gap', () => {
    expect(classifyStaleness(10, 0)).toBe('current');
  });
  it('returns stale for 180 days, no major gap', () => {
    expect(classifyStaleness(180, 0)).toBe('stale');
  });
  it('returns very-stale for 1 major behind', () => {
    expect(classifyStaleness(30, 1)).toBe('very-stale');
  });
  it('returns very-stale for 400 days behind', () => {
    expect(classifyStaleness(400, 0)).toBe('very-stale');
  });
  it('returns ancient for 3+ majors behind', () => {
    expect(classifyStaleness(50, 3)).toBe('ancient');
  });
  it('returns ancient for 800 days behind', () => {
    expect(classifyStaleness(800, 0)).toBe('ancient');
  });
});

describe('calcStalenessScore', () => {
  it('returns 0 for fresh dependency', () => {
    expect(calcStalenessScore(0, 0, 0)).toBe(0);
  });
  it('caps at 100', () => {
    expect(calcStalenessScore(730, 3, 10)).toBeLessThanOrEqual(100);
  });
  it('increases with more majors behind', () => {
    const a = calcStalenessScore(30, 0, 0);
    const b = calcStalenessScore(30, 2, 0);
    expect(b).toBeGreaterThan(a);
  });
});

describe('buildStalenessEntry', () => {
  it('builds entry with correct label and score', () => {
    const dep = makeDep('react', '16.0.0');
    const entry = buildStalenessEntry(dep, '18.2.0', daysAgo(400));
    expect(entry.name).toBe('react');
    expect(entry.majorsBehind).toBe(2);
    expect(entry.label).toBe('very-stale');
    expect(entry.stalenessScore).toBeGreaterThan(0);
  });

  it('returns current for up-to-date dep', () => {
    const dep = makeDep('lodash', '4.17.21');
    const entry = buildStalenessEntry(dep, '4.17.21', daysAgo(5));
    expect(entry.label).toBe('current');
    expect(entry.majorsBehind).toBe(0);
  });
});

describe('detectStaleness', () => {
  it('filters out deps missing from latestMap', () => {
    const deps = [makeDep('a', '1.0.0'), makeDep('b', '2.0.0')];
    const map = { a: { version: '1.0.0', publishedAt: daysAgo(10) } };
    const result = detectStaleness(deps, map);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('a');
  });

  it('sorts by stalenessScore descending', () => {
    const deps = [makeDep('x', '1.0.0'), makeDep('y', '1.0.0')];
    const map = {
      x: { version: '1.0.0', publishedAt: daysAgo(5) },
      y: { version: '3.0.0', publishedAt: daysAgo(500) },
    };
    const result = detectStaleness(deps, map);
    expect(result[0].name).toBe('y');
  });
});

describe('summarizeStaleness', () => {
  it('counts labels correctly', () => {
    const deps = [makeDep('a', '1.0.0'), makeDep('b', '1.0.0'), makeDep('c', '1.0.0')];
    const map = {
      a: { version: '1.0.0', publishedAt: daysAgo(5) },
      b: { version: '1.0.0', publishedAt: daysAgo(200) },
      c: { version: '4.0.0', publishedAt: daysAgo(800) },
    };
    const entries = detectStaleness(deps, map);
    const summary = summarizeStaleness(entries);
    expect(summary.total).toBe(3);
    expect(summary.current).toBe(1);
    expect(summary.stale).toBe(1);
    expect(summary.ancient).toBe(1);
  });
});
