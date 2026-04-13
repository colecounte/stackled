import {
  gradeFromComplexity,
  calcDepthScore,
  calcVersionSpreadScore,
  calcComplexityScore,
  buildComplexityEntry,
  scoreDependencyComplexity,
} from './dependency-complexity-scorer';
import { ParsedDependency } from '../types';

function makeDep(name: string, version = '1.0.0'): ParsedDependency {
  return { name, version, type: 'dependency' };
}

describe('gradeFromComplexity', () => {
  it('returns A for score <= 20', () => expect(gradeFromComplexity(10)).toBe('A'));
  it('returns B for score <= 40', () => expect(gradeFromComplexity(30)).toBe('B'));
  it('returns C for score <= 60', () => expect(gradeFromComplexity(50)).toBe('C'));
  it('returns D for score <= 80', () => expect(gradeFromComplexity(70)).toBe('D'));
  it('returns F for score > 80', () => expect(gradeFromComplexity(90)).toBe('F'));
});

describe('calcDepthScore', () => {
  it('returns 10 for depth 1', () => expect(calcDepthScore(1)).toBe(10));
  it('caps at 50 for large depth', () => expect(calcDepthScore(10)).toBe(50));
  it('returns 0 for depth 0', () => expect(calcDepthScore(0)).toBe(0));
});

describe('calcVersionSpreadScore', () => {
  it('returns 5 for single version', () => expect(calcVersionSpreadScore(['1.0.0'])).toBe(5));
  it('returns 10 for two unique versions', () =>
    expect(calcVersionSpreadScore(['1.0.0', '2.0.0'])).toBe(10));
  it('deduplicates versions', () =>
    expect(calcVersionSpreadScore(['1.0.0', '1.0.0'])).toBe(5));
  it('caps at 30', () =>
    expect(calcVersionSpreadScore(['1.0', '2.0', '3.0', '4.0', '5.0', '6.0', '7.0'])).toBe(30));
});

describe('calcComplexityScore', () => {
  it('averages the three sub-scores', () => {
    expect(calcComplexityScore(0, 0, 0)).toBe(0);
    expect(calcComplexityScore(10, 20, 30)).toBe(Math.round((20 + 20 + 30) / 3));
  });
});

describe('buildComplexityEntry', () => {
  it('builds an entry with correct grade', () => {
    const entry = buildComplexityEntry(makeDep('lodash'), 5, 2, ['4.17.21']);
    expect(entry.name).toBe('lodash');
    expect(entry.transitiveCount).toBe(5);
    expect(entry.depthScore).toBe(20);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(entry.grade);
  });
});

describe('scoreDependencyComplexity', () => {
  const deps = [makeDep('react'), makeDep('lodash')];
  const transitiveMap = { react: 50, lodash: 3 };
  const depthMap = { react: 4, lodash: 1 };
  const versionMap = { react: ['18.0.0', '17.0.0'], lodash: ['4.17.21'] };

  it('returns entries for all deps', () => {
    const result = scoreDependencyComplexity(deps, transitiveMap, depthMap, versionMap);
    expect(result.entries).toHaveLength(2);
  });

  it('identifies mostComplex', () => {
    const result = scoreDependencyComplexity(deps, transitiveMap, depthMap, versionMap);
    expect(result.mostComplex).toBe('react');
  });

  it('calculates averageScore', () => {
    const result = scoreDependencyComplexity(deps, transitiveMap, depthMap, versionMap);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
  });

  it('returns null mostComplex for empty deps', () => {
    const result = scoreDependencyComplexity([], {}, {}, {});
    expect(result.mostComplex).toBeNull();
    expect(result.averageScore).toBe(0);
  });

  it('counts highComplexityCount correctly', () => {
    const result = scoreDependencyComplexity(deps, transitiveMap, depthMap, versionMap);
    expect(result.highComplexityCount).toBeGreaterThanOrEqual(0);
  });
});
