import { describe, it, expect } from 'vitest';
import {
  classifyAdoptionRate,
  calcVersionsBehind,
  buildAdoptionEntry,
  trackAdoption,
  summarizeAdoption,
} from './dependency-adoption-tracker.js';
import type { DependencyInfo } from '../types/index.js';

function makeDep(name: string, currentVersion: string): DependencyInfo {
  return { name, currentVersion, latestVersion: currentVersion, type: 'dependency', updateAvailable: false };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('classifyAdoptionRate', () => {
  it('returns fast for <= 30 days', () => expect(classifyAdoptionRate(15)).toBe('fast'));
  it('returns moderate for <= 90 days', () => expect(classifyAdoptionRate(60)).toBe('moderate'));
  it('returns slow for <= 180 days', () => expect(classifyAdoptionRate(120)).toBe('slow'));
  it('returns stale for > 180 days', () => expect(classifyAdoptionRate(200)).toBe('stale'));
  it('returns fast for exactly 0 days', () => expect(classifyAdoptionRate(0)).toBe('fast'));
});

describe('calcVersionsBehind', () => {
  const versions = ['3.0.0', '2.1.0', '2.0.0', '1.0.0'];
  it('returns 0 when on latest', () => expect(calcVersionsBehind('3.0.0', '3.0.0', versions)).toBe(0));
  it('returns 1 when one behind', () => expect(calcVersionsBehind('2.1.0', '3.0.0', versions)).toBe(1));
  it('returns 2 when two behind', () => expect(calcVersionsBehind('2.0.0', '3.0.0', versions)).toBe(2));
  it('returns 0 if version not found', () => expect(calcVersionsBehind('0.1.0', '3.0.0', versions)).toBe(0));
});

describe('buildAdoptionEntry', () => {
  it('builds entry with lag days', () => {
    const dep = makeDep('lodash', '4.17.0');
    const entry = buildAdoptionEntry(dep, '4.17.21', ['4.17.21', '4.17.0'], daysAgo(60), daysAgo(0));
    expect(entry.name).toBe('lodash');
    expect(entry.adoptionLag).toBeGreaterThanOrEqual(59);
    expect(entry.adoptionRate).toBe('moderate');
    expect(entry.versionsBehind).toBe(1);
  });

  it('handles null release dates gracefully', () => {
    const dep = makeDep('react', '18.0.0');
    const entry = buildAdoptionEntry(dep, '18.2.0', ['18.2.0', '18.0.0'], null, null);
    expect(entry.adoptionLag).toBe(0);
    expect(entry.adoptionRate).toBe('fast');
  });
});

describe('trackAdoption', () => {
  it('maps deps to adoption entries', () => {
    const deps = [makeDep('express', '4.17.0')];
    const registryData = new Map([
      ['express', { latest: '4.18.2', versions: ['4.18.2', '4.17.0'], releaseDate: daysAgo(200), latestReleaseDate: daysAgo(0) }],
    ]);
    const result = trackAdoption(deps, registryData);
    expect(result).toHaveLength(1);
    expect(result[0].latestVersion).toBe('4.18.2');
    expect(result[0].adoptionRate).toBe('stale');
  });

  it('falls back gracefully when no registry data', () => {
    const deps = [makeDep('unknown-pkg', '1.0.0')];
    const result = trackAdoption(deps, new Map());
    expect(result[0].adoptionLag).toBe(0);
  });
});

describe('summarizeAdoption', () => {
  it('returns correct counts and average lag', () => {
    const entries = [
      { name: 'a', currentVersion: '1.0.0', latestVersion: '1.0.0', adoptionLag: 10, adoptionRate: 'fast' as const, versionsBehind: 0, releaseDate: null, latestReleaseDate: null },
      { name: 'b', currentVersion: '1.0.0', latestVersion: '2.0.0', adoptionLag: 200, adoptionRate: 'stale' as const, versionsbehind: 2, versionsBehind: 2, releaseDate: null, latestReleaseDate: null },
    ];
    const summary = summarizeAdoption(entries);
    expect(summary.total).toBe(2);
    expect(summary.fast).toBe(1);
    expect(summary.stale).toBe(1);
    expect(summary.averageLagDays).toBe(105);
  });

  it('handles empty list', () => {
    const summary = summarizeAdoption([]);
    expect(summary.total).toBe(0);
    expect(summary.averageLagDays).toBe(0);
  });
});
