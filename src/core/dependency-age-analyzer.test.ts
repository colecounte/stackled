import {
  calcAgeInDays,
  classifyAgeRisk,
  formatAgeLabel,
  buildAgeEntry,
  analyzeDependencyAges,
  summarizeAges,
} from './dependency-age-analyzer';
import { Dependency } from '../types';

function makeDep(name: string, currentVersion = '1.0.0'): Dependency {
  return { name, currentVersion, latestVersion: currentVersion, type: 'production' };
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('calcAgeInDays', () => {
  it('returns null for null input', () => {
    expect(calcAgeInDays(null)).toBeNull();
  });

  it('returns approximate days for a known date', () => {
    const result = calcAgeInDays(daysAgo(100));
    expect(result).toBeGreaterThanOrEqual(99);
    expect(result).toBeLessThanOrEqual(101);
  });
});

describe('classifyAgeRisk', () => {
  it('returns medium for null', () => {
    expect(classifyAgeRisk(null)).toBe('medium');
  });

  it('returns low for < 365 days', () => {
    expect(classifyAgeRisk(180)).toBe('low');
  });

  it('returns medium for 365–730 days', () => {
    expect(classifyAgeRisk(500)).toBe('medium');
  });

  it('returns high for > 730 days', () => {
    expect(classifyAgeRisk(800)).toBe('high');
  });
});

describe('formatAgeLabel', () => {
  it('returns unknown for null', () => {
    expect(formatAgeLabel(null)).toBe('unknown');
  });

  it('formats days under a month', () => {
    expect(formatAgeLabel(15)).toBe('15d');
  });

  it('formats months under a year', () => {
    expect(formatAgeLabel(90)).toBe('3mo');
  });

  it('formats years and months', () => {
    expect(formatAgeLabel(400)).toBe('1y 1mo');
  });

  it('formats exact years', () => {
    expect(formatAgeLabel(365)).toBe('1y');
  });
});

describe('buildAgeEntry', () => {
  it('builds entry with correct fields', () => {
    const dep = makeDep('lodash', '4.17.21');
    const entry = buildAgeEntry(dep, daysAgo(800));
    expect(entry.name).toBe('lodash');
    expect(entry.risk).toBe('high');
    expect(entry.ageInDays).toBeGreaterThan(700);
  });
});

describe('analyzeDependencyAges', () => {
  it('maps deps to age entries', () => {
    const deps = [makeDep('react'), makeDep('vue')];
    const dates: Record<string, Date | null> = {
      react: daysAgo(200),
      vue: daysAgo(800),
    };
    const result = analyzeDependencyAges(deps, dates);
    expect(result).toHaveLength(2);
    expect(result[0].risk).toBe('low');
    expect(result[1].risk).toBe('high');
  });
});

describe('summarizeAges', () => {
  it('counts correctly by risk bucket', () => {
    const deps = [makeDep('a'), makeDep('b'), makeDep('c')];
    const dates = { a: daysAgo(10), b: daysAgo(500), c: daysAgo(800) };
    const entries = analyzeDependencyAges(deps, dates);
    const summary = summarizeAges(entries);
    expect(summary.total).toBe(3);
    expect(summary.fresh).toBe(1);
    expect(summary.stale).toBe(1);
    expect(summary.ancient).toBe(1);
  });
});
