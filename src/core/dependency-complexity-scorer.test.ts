import { gradeFromComplexity, calcDepthScore, calcVersionSpreadScore, calcComplexityScore, buildComplexityEntry, scoreDependencyComplexity } from './dependency-complexity-scorer';
import { ParsedDependency } from '../types';

function makeDep(overrides: Partial<ParsedDependency> = {}): ParsedDependency {
  return {
    name: 'example',
    currentVersion: '1.0.0',
    specifiedVersion: '^1.0.0',
    type: 'dependency',
    ...overrides,
  };
}

describe('gradeFromComplexity', () => {
  it('returns A for low complexity', () => expect(gradeFromComplexity(10)).toBe('A'));
  it('returns B for moderate complexity', () => expect(gradeFromComplexity(35)).toBe('B'));
  it('returns C for medium complexity', () => expect(gradeFromComplexity(55)).toBe('C'));
  it('returns D for high complexity', () => expect(gradeFromComplexity(75)).toBe('D'));
  it('returns F for very high complexity', () => expect(gradeFromComplexity(95)).toBe('F'));
});

describe('calcDepthScore', () => {
  it('returns 0 for depth 0', () => expect(calcDepthScore(0)).toBe(0));
  it('returns higher score for deeper depth', () => expect(calcDepthScore(5)).toBeGreaterThan(calcDepthScore(2)));
  it('caps at 100', () => expect(calcDepthScore(100)).toBeLessThanOrEqual(100));
});

describe('calcVersionSpreadScore', () => {
  it('returns 0 for single version', () => expect(calcVersionSpreadScore(1, 1)).toBe(0));
  it('returns higher score for more versions', () => expect(calcVersionSpreadScore(5, 10)).toBeGreaterThan(0));
});

describe('calcComplexityScore', () => {
  it('combines depth and spread into a score', () => {
    const score = calcComplexityScore(3, 2, 5);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('buildComplexityEntry', () => {
  it('builds a valid entry', () => {
    const dep = makeDep({ name: 'lodash', currentVersion: '4.17.21' });
    const entry = buildComplexityEntry(dep, 2, 1, 3);
    expect(entry.name).toBe('lodash');
    expect(entry.grade).toMatch(/^[A-F]$/);
    expect(typeof entry.score).toBe('number');
  });
});

describe('scoreDependencyComplexity', () => {
  it('returns an entry per dependency', () => {
    const deps = [makeDep({ name: 'a' }), makeDep({ name: 'b' })];
    const results = scoreDependencyComplexity(deps);
    expect(results).toHaveLength(2);
  });

  it('sorts by score descending', () => {
    const deps = [makeDep({ name: 'a' }), makeDep({ name: 'b' })];
    const results = scoreDependencyComplexity(deps);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});
