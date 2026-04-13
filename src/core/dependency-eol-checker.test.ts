import { lookupEolDate, calcDaysUntilEol, classifyEolRisk, buildEolEntry, checkDependencyEol } from './dependency-eol-checker';
import type { ParsedDependency } from '../types';

function makeDep(name: string, version: string): ParsedDependency {
  return { name, version, type: 'dependency', raw: `${name}@${version}` };
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

describe('lookupEolDate', () => {
  it('returns a date string for known packages', () => {
    const result = lookupEolDate('node', '14');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns null for unknown packages', () => {
    expect(lookupEolDate('unknown-pkg', '1')).toBeNull();
  });
});

describe('calcDaysUntilEol', () => {
  it('returns positive number for future EOL', () => {
    const future = daysFromNow(90);
    expect(calcDaysUntilEol(future)).toBeGreaterThan(0);
  });

  it('returns negative number for past EOL', () => {
    const past = daysAgo(30);
    expect(calcDaysUntilEol(past)).toBeLessThan(0);
  });
});

describe('classifyEolRisk', () => {
  it('returns critical for already EOL', () => {
    expect(classifyEolRisk(-1)).toBe('critical');
  });

  it('returns high for within 90 days', () => {
    expect(classifyEolRisk(45)).toBe('high');
  });

  it('returns medium for within 180 days', () => {
    expect(classifyEolRisk(120)).toBe('medium');
  });

  it('returns low for beyond 180 days', () => {
    expect(classifyEolRisk(365)).toBe('low');
  });

  it('returns none when eolDate is null', () => {
    expect(classifyEolRisk(null)).toBe('none');
  });
});

describe('buildEolEntry', () => {
  it('builds entry with EOL info for known runtime', () => {
    const dep = makeDep('node', '14.0.0');
    const entry = buildEolEntry(dep);
    expect(entry.name).toBe('node');
    expect(['critical', 'high', 'medium', 'low', 'none']).toContain(entry.risk);
  });

  it('builds entry with none risk for unknown package', () => {
    const dep = makeDep('my-private-lib', '1.0.0');
    const entry = buildEolEntry(dep);
    expect(entry.risk).toBe('none');
    expect(entry.eolDate).toBeNull();
  });
});

describe('checkDependencyEol', () => {
  it('returns an array of entries for each dependency', () => {
    const deps = [makeDep('node', '14.0.0'), makeDep('react', '17.0.0')];
    const results = checkDependencyEol(deps);
    expect(results).toHaveLength(2);
    results.forEach(r => {
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('risk');
      expect(r).toHaveProperty('eolDate');
      expect(r).toHaveProperty('daysUntilEol');
    });
  });

  it('returns empty array for no dependencies', () => {
    expect(checkDependencyEol([])).toEqual([]);
  });
});
