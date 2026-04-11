import {
  levenshtein,
  calcSimilarity,
  classifyRisk,
  buildTyposquatResult,
  detectTyposquats,
  summarizeTyposquats,
} from './typosquat-detector';
import { ParsedDependency } from '../types';

const makeDep = (name: string): ParsedDependency => ({
  name,
  version: '1.0.0',
  type: 'dependency',
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('react', 'react')).toBe(0);
  });

  it('returns correct distance for simple substitution', () => {
    expect(levenshtein('react', 'reakt')).toBe(1);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('calcSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(calcSimilarity('lodash', 'lodash')).toBe(1);
  });

  it('returns high similarity for close names', () => {
    expect(calcSimilarity('reakt', 'react')).toBeGreaterThan(0.7);
  });

  it('returns low similarity for unrelated names', () => {
    expect(calcSimilarity('zzz-unrelated', 'react')).toBeLessThan(0.5);
  });

  it('handles empty strings without error', () => {
    expect(calcSimilarity('', '')).toBe(1);
  });
});

describe('classifyRisk', () => {
  it('returns high for similarity >= 0.85', () => {
    expect(classifyRisk(0.9)).toBe('high');
    expect(classifyRisk(0.85)).toBe('high');
  });

  it('returns medium for similarity between 0.70 and 0.85', () => {
    expect(classifyRisk(0.75)).toBe('medium');
  });

  it('returns low for similarity < 0.70', () => {
    expect(classifyRisk(0.5)).toBe('low');
  });
});

describe('buildTyposquatResult', () => {
  it('builds a result with correct fields', () => {
    const result = buildTyposquatResult('reakt', 'react', 0.8);
    expect(result.name).toBe('reakt');
    expect(result.suspectedTarget).toBe('react');
    expect(result.similarity).toBe(0.8);
    expect(result.risk).toBe('medium');
    expect(result.reason).toContain('react');
  });
});

describe('detectTyposquats', () => {
  it('flags packages similar to known popular packages', () => {
    const deps = [makeDep('reakt'), makeDep('lodassh')];
    const results = detectTyposquats(deps);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.name === 'reakt')).toBe(true);
  });

  it('does not flag exact matches to known packages', () => {
    const deps = [makeDep('react'), makeDep('lodash')];
    const results = detectTyposquats(deps);
    expect(results.length).toBe(0);
  });

  it('does not flag unrelated packages', () => {
    const deps = [makeDep('my-totally-unique-pkg-xyz')];
    const results = detectTyposquats(deps);
    expect(results.length).toBe(0);
  });

  it('uses custom known packages list', () => {
    const deps = [makeDep('my-libb')];
    const results = detectTyposquats(deps, ['my-lib']);
    expect(results.length).toBe(1);
    expect(results[0].suspectedTarget).toBe('my-lib');
  });
});

describe('summarizeTyposquats', () => {
  it('returns correct counts', () => {
    const results = [
      buildTyposquatResult('a', 'react', 0.9),
      buildTyposquatResult('b', 'lodash', 0.75),
      buildTyposquatResult('c', 'jest', 0.5),
    ];
    const summary = summarizeTyposquats(results);
    expect(summary.total).toBe(3);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(1);
  });

  it('returns zeros for empty results', () => {
    const summary = summarizeTyposquats([]);
    expect(summary.total).toBe(0);
  });
});
