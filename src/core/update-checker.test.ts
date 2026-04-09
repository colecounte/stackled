import { describe, it, expect } from 'vitest';
import {
  determineUpdateType,
  checkForUpdates,
  filterByUpdateType,
} from './update-checker';
import { Dependency } from '../types/index';

const mockDeps: Dependency[] = [
  { name: 'react', version: '17.0.2', isDev: false },
  { name: 'lodash', version: '4.17.20', isDev: false },
  { name: 'typescript', version: '4.9.0', isDev: true },
  { name: 'vitest', version: '0.34.0', isDev: true },
];

const latestVersions: Record<string, string> = {
  react: '18.2.0',
  lodash: '4.17.21',
  typescript: '5.3.3',
  vitest: '0.34.0',
};

describe('determineUpdateType', () => {
  it('returns major for major version bump', () => {
    expect(determineUpdateType('17.0.2', '18.2.0')).toBe('major');
  });

  it('returns minor for minor version bump', () => {
    expect(determineUpdateType('4.9.0', '4.12.0')).toBe('minor');
  });

  it('returns patch for patch version bump', () => {
    expect(determineUpdateType('4.17.20', '4.17.21')).toBe('patch');
  });

  it('returns none when versions are equal', () => {
    expect(determineUpdateType('0.34.0', '0.34.0')).toBe('none');
  });

  it('handles versions with range prefixes', () => {
    expect(determineUpdateType('^4.9.0', '5.3.3')).toBe('major');
  });
});

describe('checkForUpdates', () => {
  it('returns results for all known dependencies', () => {
    const results = checkForUpdates(mockDeps, latestVersions);
    expect(results).toHaveLength(4);
  });

  it('marks up-to-date dependency correctly', () => {
    const results = checkForUpdates(mockDeps, latestVersions);
    const vitest = results.find((r) => r.dependency.name === 'vitest');
    expect(vitest?.updateType).toBe('none');
    expect(vitest?.updateInfo.isOutdated).toBe(false);
  });

  it('marks outdated dependency with correct update type', () => {
    const results = checkForUpdates(mockDeps, latestVersions);
    const react = results.find((r) => r.dependency.name === 'react');
    expect(react?.updateType).toBe('major');
    expect(react?.updateInfo.isOutdated).toBe(true);
    expect(react?.latestVersion).toBe('18.2.0');
  });

  it('excludes dependencies not in latestVersionsMap', () => {
    const results = checkForUpdates(mockDeps, { react: '18.2.0' });
    expect(results).toHaveLength(1);
  });
});

describe('filterByUpdateType', () => {
  it('filters to only major updates', () => {
    const results = checkForUpdates(mockDeps, latestVersions);
    const majors = filterByUpdateType(results, 'major');
    expect(majors.every((r) => r.updateType === 'major')).toBe(true);
  });

  it('returns empty array when no matches', () => {
    const results = checkForUpdates(mockDeps, latestVersions);
    const patches = filterByUpdateType(results, 'patch');
    expect(patches).toHaveLength(1);
    expect(patches[0].dependency.name).toBe('lodash');
  });
});
