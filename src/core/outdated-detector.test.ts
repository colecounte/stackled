import { describe, it, expect } from 'vitest';
import {
  isOutdated,
  buildOutdatedEntry,
  detectOutdated,
  summarizeOutdated,
} from './outdated-detector';
import { DependencyInfo } from '../types/index';

const makeDep = (name: string, current: string, latest?: string): DependencyInfo => ({
  name,
  currentVersion: current,
  latestVersion: latest,
});

describe('isOutdated', () => {
  it('returns true when current is behind latest', () => {
    expect(isOutdated('1.0.0', '2.0.0')).toBe(true);
  });

  it('returns false when versions are equal', () => {
    expect(isOutdated('2.0.0', '2.0.0')).toBe(false);
  });

  it('returns false when current is ahead of latest', () => {
    expect(isOutdated('3.0.0', '2.0.0')).toBe(false);
  });

  it('handles range specifiers gracefully', () => {
    expect(isOutdated('^1.2.3', '1.3.0')).toBe(true);
  });

  it('returns false for invalid versions', () => {
    expect(isOutdated('invalid', '1.0.0')).toBe(false);
  });
});

describe('buildOutdatedEntry', () => {
  it('builds a correct outdated entry for a major bump', () => {
    const dep = makeDep('react', '17.0.0', '18.0.0');
    const entry = buildOutdatedEntry(dep, '18.0.0');
    expect(entry.name).toBe('react');
    expect(entry.currentVersion).toBe('17.0.0');
    expect(entry.latestVersion).toBe('18.0.0');
    expect(entry.versionDiff).toBe('major');
    expect(entry.updateAvailable).toBe(true);
  });

  it('marks pre-release versions as not stable', () => {
    const dep = makeDep('alpha-pkg', '1.0.0', '2.0.0-beta.1');
    const entry = buildOutdatedEntry(dep, '2.0.0-beta.1');
    expect(entry.isStable).toBe(false);
  });
});

describe('detectOutdated', () => {
  it('returns only outdated dependencies', () => {
    const deps = [
      makeDep('lodash', '4.17.0', '4.17.21'),
      makeDep('react', '18.0.0', '18.0.0'),
      makeDep('axios', '0.21.0', '1.4.0'),
    ];
    const result = detectOutdated(deps);
    expect(result).toHaveLength(2);
    expect(result.map(d => d.name)).toContain('lodash');
    expect(result.map(d => d.name)).toContain('axios');
  });

  it('skips deps without latestVersion', () => {
    const deps = [makeDep('unknown-pkg', '1.0.0')];
    expect(detectOutdated(deps)).toHaveLength(0);
  });

  it('sorts by severity: major before minor before patch', () => {
    const deps = [
      makeDep('a', '1.0.0', '1.0.1'),
      makeDep('b', '1.0.0', '2.0.0'),
      makeDep('c', '1.0.0', '1.1.0'),
    ];
    const result = detectOutdated(deps);
    expect(result[0].versionDiff).toBe('major');
    expect(result[1].versionDiff).toBe('minor');
    expect(result[2].versionDiff).toBe('patch');
  });
});

describe('summarizeOutdated', () => {
  it('counts by version diff type', () => {
    const outdated = [
      { name: 'a', currentVersion: '1.0.0', latestVersion: '2.0.0', versionDiff: 'major', isStable: true, updateAvailable: true },
      { name: 'b', currentVersion: '1.0.0', latestVersion: '1.1.0', versionDiff: 'minor', isStable: true, updateAvailable: true },
      { name: 'c', currentVersion: '1.0.0', latestVersion: '1.0.1', versionDiff: 'patch', isStable: true, updateAvailable: true },
      { name: 'd', currentVersion: '1.0.0', latestVersion: '3.0.0', versionDiff: 'major', isStable: true, updateAvailable: true },
    ];
    const summary = summarizeOutdated(outdated);
    expect(summary.major).toBe(2);
    expect(summary.minor).toBe(1);
    expect(summary.patch).toBe(1);
  });
});
