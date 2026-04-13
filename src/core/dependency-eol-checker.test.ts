import { describe, it, expect } from 'vitest';
import {
  lookupEolDate,
  calcDaysUntilEol,
  classifyEolRisk,
  buildEolEntry,
  checkDependencyEol,
} from './dependency-eol-checker';
import { ParsedDependency } from '../types';

function makeDep(name: string, version: string): ParsedDependency {
  return { name, currentVersion: version, requestedRange: `^${version}`, type: 'production' };
}

describe('lookupEolDate', () => {
  it('returns EOL date for known package and major version', () => {
    const date = lookupEolDate('node', '14.21.0');
    expect(date).toBe('2023-04-30');
  });

  it('returns null for unknown package', () => {
    expect(lookupEolDate('lodash', '4.17.21')).toBeNull();
  });

  it('returns null for unknown major version', () => {
    expect(lookupEolDate('node', '99.0.0')).toBeNull();
  });

  it('is case-insensitive for package name', () => {
    expect(lookupEolDate('React', '16.0.0')).toBe('2024-01-01');
  });
});

describe('calcDaysUntilEol', () => {
  it('returns negative value for past EOL date', () => {
    const days = calcDaysUntilEol('2020-01-01');
    expect(days).toBeLessThan(0);
  });

  it('returns positive value for future EOL date', () => {
    const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const days = calcDaysUntilEol(future);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(60);
  });
});

describe('classifyEolRisk', () => {
  it('returns critical when already EOL', () => {
    expect(classifyEolRisk(-10, true)).toBe('critical');
  });

  it('returns high when within 30 days', () => {
    expect(classifyEolRisk(15, false)).toBe('high');
  });

  it('returns medium when within 90 days', () => {
    expect(classifyEolRisk(60, false)).toBe('medium');
  });

  it('returns low when within 180 days', () => {
    expect(classifyEolRisk(120, false)).toBe('low');
  });

  it('returns none when no EOL data', () => {
    expect(classifyEolRisk(null, false)).toBe('none');
  });

  it('returns none when far in the future', () => {
    expect(classifyEolRisk(365, false)).toBe('none');
  });
});

describe('buildEolEntry', () => {
  it('marks known EOL package as critical', () => {
    const entry = buildEolEntry(makeDep('node', '14.21.0'));
    expect(entry.isEol).toBe(true);
    expect(entry.risk).toBe('critical');
    expect(entry.notes).toContain('Reached EOL');
  });

  it('returns none risk for unknown package', () => {
    const entry = buildEolEntry(makeDep('lodash', '4.17.21'));
    expect(entry.risk).toBe('none');
    expect(entry.eolDate).toBeNull();
    expect(entry.isEol).toBe(false);
  });
});

describe('checkDependencyEol', () => {
  it('counts EOL and soon-to-expire packages correctly', () => {
    const deps = [
      makeDep('node', '14.21.0'),
      makeDep('lodash', '4.17.21'),
      makeDep('react', '16.0.0'),
    ];
    const summary = checkDependencyEol(deps);
    expect(summary.total).toBe(3);
    expect(summary.eolCount).toBeGreaterThanOrEqual(2);
    expect(summary.entries).toHaveLength(3);
  });

  it('returns zero counts for deps with no EOL data', () => {
    const summary = checkDependencyEol([makeDep('lodash', '4.17.21')]);
    expect(summary.eolCount).toBe(0);
    expect(summary.soonCount).toBe(0);
  });
});
