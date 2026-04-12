import { describe, it, expect } from 'vitest';
import {
  assessCompatibility,
  buildCompatibilityEntry,
  buildCompatibilityMatrix,
} from './compatibility-matrix.js';
import { ParsedDependency } from '../types/index.js';

function makeDep(name: string, version: string): ParsedDependency {
  return { name, currentVersion: version, versionRange: `^${version}`, type: 'production' };
}

describe('assessCompatibility', () => {
  it('returns low risk for patch bump', () => {
    const result = assessCompatibility('1.0.0', '1.0.1', null);
    expect(result.risk).toBe('low');
    expect(result.breakingChange).toBe(false);
    expect(result.compatible).toBe(true);
  });

  it('returns medium risk for minor bump', () => {
    const result = assessCompatibility('1.0.0', '1.1.0', null);
    expect(result.risk).toBe('medium');
    expect(result.breakingChange).toBe(false);
  });

  it('returns high risk for major bump', () => {
    const result = assessCompatibility('1.0.0', '2.0.0', null);
    expect(result.risk).toBe('high');
    expect(result.breakingChange).toBe(true);
    expect(result.compatible).toBe(false);
  });

  it('marks incompatible when node range not satisfied', () => {
    const result = assessCompatibility('1.0.0', '1.0.1', '>=99.0.0');
    expect(result.compatible).toBe(false);
  });

  it('marks compatible when node range is satisfied', () => {
    const result = assessCompatibility('1.0.0', '1.0.1', '>=0.0.1');
    expect(result.compatible).toBe(true);
  });
});

describe('buildCompatibilityEntry', () => {
  it('includes breaking change note for major bump', () => {
    const dep = makeDep('react', '17.0.0');
    const entry = buildCompatibilityEntry(dep, '18.0.0', null);
    expect(entry.breakingChange).toBe(true);
    expect(entry.notes.some((n) => n.includes('Major version bump'))).toBe(true);
  });

  it('includes node range note when incompatible', () => {
    const dep = makeDep('some-pkg', '1.0.0');
    const entry = buildCompatibilityEntry(dep, '1.0.1', '>=99.0.0');
    expect(entry.notes.some((n) => n.includes('Requires Node'))).toBe(true);
  });

  it('has empty notes for safe patch update', () => {
    const dep = makeDep('lodash', '4.17.20');
    const entry = buildCompatibilityEntry(dep, '4.17.21', '>=12.0.0');
    expect(entry.notes).toHaveLength(0);
    expect(entry.compatible).toBe(true);
  });
});

describe('buildCompatibilityMatrix', () => {
  it('correctly summarizes entries', () => {
    const dep1 = makeDep('a', '1.0.0');
    const dep2 = makeDep('b', '2.0.0');
    const entries = [
      buildCompatibilityEntry(dep1, '1.0.1', null),
      buildCompatibilityEntry(dep2, '3.0.0', null),
    ];
    const matrix = buildCompatibilityMatrix(entries);
    expect(matrix.totalChecked).toBe(2);
    expect(matrix.breakingCount).toBe(1);
    expect(matrix.incompatibleCount).toBe(1);
  });

  it('returns zero counts for all-compatible entries', () => {
    const dep = makeDep('c', '1.0.0');
    const matrix = buildCompatibilityMatrix([buildCompatibilityEntry(dep, '1.0.1', null)]);
    expect(matrix.incompatibleCount).toBe(0);
    expect(matrix.breakingCount).toBe(0);
  });
});
