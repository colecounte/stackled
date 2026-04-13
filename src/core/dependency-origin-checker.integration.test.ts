import { detectOrigin, buildOriginEntry, checkDependencyOrigins, summarizeOrigins } from './dependency-origin-checker';
import { PackageInfo } from '../types';

function makePkg(name: string, version: string): PackageInfo {
  return { name, version, currentVersion: version, latestVersion: version } as PackageInfo;
}

describe('dependency-origin-checker integration', () => {
  const mixed: PackageInfo[] = [
    makePkg('react', '^18.2.0'),
    makePkg('lodash', '4.17.21'),
    makePkg('my-fork', 'user/my-fork#fix-bug'),
    makePkg('local-utils', 'file:../local-utils'),
    makePkg('private-pkg', 'gitlab:org/private-pkg'),
    makePkg('weird', '???'),
  ];

  it('correctly classifies all origins in a mixed list', () => {
    const entries = checkDependencyOrigins(mixed);
    expect(entries.find((e) => e.name === 'react')?.origin).toBe('npm');
    expect(entries.find((e) => e.name === 'lodash')?.origin).toBe('npm');
    expect(entries.find((e) => e.name === 'my-fork')?.origin).toBe('github');
    expect(entries.find((e) => e.name === 'local-utils')?.origin).toBe('local');
    expect(entries.find((e) => e.name === 'private-pkg')?.origin).toBe('gitlab');
    expect(entries.find((e) => e.name === 'weird')?.origin).toBe('unknown');
  });

  it('summary counts match entries', () => {
    const entries = checkDependencyOrigins(mixed);
    const summary = summarizeOrigins(entries);
    expect(summary.total).toBe(mixed.length);
    expect(summary.byOrigin.npm).toBe(2);
    expect(summary.byOrigin.github).toBe(1);
    expect(summary.byOrigin.local).toBe(1);
    expect(summary.byOrigin.gitlab).toBe(1);
    expect(summary.byOrigin.unknown).toBe(1);
    expect(summary.highRisk).toBe(2); // local + unknown
  });

  it('non-npm entries all carry flags', () => {
    const entries = checkDependencyOrigins(mixed);
    const nonNpm = entries.filter((e) => e.origin !== 'npm');
    for (const e of nonNpm) {
      expect(e.flags.length).toBeGreaterThan(0);
    }
  });

  it('npm entries have no flags', () => {
    const entries = checkDependencyOrigins(mixed);
    const npmEntries = entries.filter((e) => e.origin === 'npm');
    for (const e of npmEntries) {
      expect(e.flags).toHaveLength(0);
    }
  });
});
