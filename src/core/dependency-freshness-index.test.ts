import { describe, it, expect } from 'vitest';
import {
  calcFreshnessScore,
  gradeFromFreshnessScore,
  countVersionsBehind,
  buildFreshnessIndexEntry,
  buildFreshnessIndex,
} from './dependency-freshness-index.js';
import type { ParsedDependency } from '../types/index.js';

function makeDep(name: string, version: string): ParsedDependency {
  return { name, version, type: 'production', rawVersion: version };
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('calcFreshnessScore', () => {
  it('returns 100 for current with recent release', () => {
    expect(calcFreshnessScore(0, 0)).toBe(100);
  });

  it('penalises versions behind', () => {
    expect(calcFreshnessScore(5, 0)).toBe(60);
  });

  it('penalises age in months', () => {
    expect(calcFreshnessScore(0, 60)).toBe(94);
  });

  it('clamps to 0 at worst', () => {
    expect(calcFreshnessScore(100, 1000)).toBe(0);
  });
});

describe('gradeFromFreshnessScore', () => {
  it('grades A for score >= 85', () => expect(gradeFromFreshnessScore(90)).toBe('A'));
  it('grades B for score 70-84', () => expect(gradeFromFreshnessScore(75)).toBe('B'));
  it('grades C for score 50-69', () => expect(gradeFromFreshnessScore(55)).toBe('C'));
  it('grades D for score 30-49', () => expect(gradeFromFreshnessScore(35)).toBe('D'));
  it('grades F for score < 30', () => expect(gradeFromFreshnessScore(10)).toBe('F'));
});

describe('countVersionsBehind', () => {
  it('counts versions strictly greater than current', () => {
    expect(countVersionsBehind('1.0.0', ['1.0.0', '1.1.0', '2.0.0'])).toBe(2);
  });

  it('returns 0 when on latest', () => {
    expect(countVersionsBehind('2.0.0', ['1.0.0', '2.0.0'])).toBe(0);
  });

  it('handles invalid version gracefully', () => {
    expect(countVersionsBehind('invalid', ['1.0.0'])).toBe(0);
  });
});

describe('buildFreshnessIndexEntry', () => {
  it('builds an entry with correct shape', () => {
    const dep = makeDep('react', '17.0.0');
    const entry = buildFreshnessIndexEntry(dep, '18.2.0', ['17.0.0', '17.0.2', '18.0.0', '18.2.0'], daysAgo(10));
    expect(entry.name).toBe('react');
    expect(entry.currentVersion).toBe('17.0.0');
    expect(entry.latestVersion).toBe('18.2.0');
    expect(entry.versionsBehind).toBe(3);
    expect(entry.daysSinceRelease).toBeGreaterThanOrEqual(9);
    expect(entry.freshnessScore).toBeGreaterThanOrEqual(0);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(entry.grade);
  });
});

describe('buildFreshnessIndex', () => {
  it('returns default summary for empty entries', () => {
    const summary = buildFreshnessIndex([]);
    expect(summary.totalPackages).toBe(0);
    expect(summary.overallGrade).toBe('A');
  });

  it('aggregates counts correctly', () => {
    const dep = makeDep('lodash', '4.17.0');
    const entry = buildFreshnessIndexEntry(dep, '4.17.21', ['4.17.0', '4.17.21'], daysAgo(5));
    const summary = buildFreshnessIndex([entry]);
    expect(summary.totalPackages).toBe(1);
    expect(summary.averageScore).toBe(entry.freshnessScore);
  });
});
