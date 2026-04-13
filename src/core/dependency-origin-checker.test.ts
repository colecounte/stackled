import {
  detectOrigin,
  classifyOriginRisk,
  buildOriginFlags,
  buildOriginEntry,
  checkDependencyOrigins,
  summarizeOrigins,
} from './dependency-origin-checker';
import { PackageInfo } from '../types';

function makePkg(name: string, version: string, repositoryUrl?: string): PackageInfo {
  return { name, version, currentVersion: version, latestVersion: version, repositoryUrl } as PackageInfo;
}

describe('detectOrigin', () => {
  it('detects npm semver', () => expect(detectOrigin('^1.2.3')).toBe('npm'));
  it('detects npm latest', () => expect(detectOrigin('latest')).toBe('npm'));
  it('detects github shorthand', () => expect(detectOrigin('user/repo#main')).toBe('github'));
  it('detects github: prefix', () => expect(detectOrigin('github:user/repo')).toBe('github'));
  it('detects gitlab: prefix', () => expect(detectOrigin('gitlab:user/repo')).toBe('gitlab'));
  it('detects bitbucket: prefix', () => expect(detectOrigin('bitbucket:user/repo')).toBe('bitbucket'));
  it('detects file: prefix', () => expect(detectOrigin('file:../local-pkg')).toBe('local'));
  it('detects relative path', () => expect(detectOrigin('./packages/utils')).toBe('local'));
  it('returns unknown for unrecognised', () => expect(detectOrigin('???')).toBe('unknown'));
});

describe('classifyOriginRisk', () => {
  it('npm is low risk', () => expect(classifyOriginRisk('npm')).toBe('low'));
  it('github is medium risk', () => expect(classifyOriginRisk('github')).toBe('medium'));
  it('local is high risk', () => expect(classifyOriginRisk('local')).toBe('high'));
  it('unknown is high risk', () => expect(classifyOriginRisk('unknown')).toBe('high'));
});

describe('buildOriginFlags', () => {
  it('returns empty for npm', () => expect(buildOriginFlags('npm')).toHaveLength(0));
  it('flags local path', () => expect(buildOriginFlags('local')[0]).toMatch(/local-path/));
  it('flags github git dep', () => expect(buildOriginFlags('github')[0]).toMatch(/git dependency/));
  it('flags unknown specifier', () => expect(buildOriginFlags('unknown')[0]).toMatch(/unrecognised/));
});

describe('buildOriginEntry', () => {
  it('builds entry for npm package', () => {
    const entry = buildOriginEntry(makePkg('lodash', '^4.17.21'));
    expect(entry.origin).toBe('npm');
    expect(entry.risk).toBe('low');
    expect(entry.flags).toHaveLength(0);
  });

  it('builds entry for github package', () => {
    const entry = buildOriginEntry(makePkg('mylib', 'user/mylib#v2'));
    expect(entry.origin).toBe('github');
    expect(entry.risk).toBe('medium');
    expect(entry.flags.length).toBeGreaterThan(0);
  });

  it('includes sourceUrl from repositoryUrl', () => {
    const entry = buildOriginEntry(makePkg('pkg', '^1.0.0', 'https://github.com/org/pkg'));
    expect(entry.sourceUrl).toBe('https://github.com/org/pkg');
  });
});

describe('checkDependencyOrigins', () => {
  it('maps all packages', () => {
    const pkgs = [makePkg('a', '^1.0.0'), makePkg('b', 'file:../b')];
    const results = checkDependencyOrigins(pkgs);
    expect(results).toHaveLength(2);
    expect(results[0].origin).toBe('npm');
    expect(results[1].origin).toBe('local');
  });
});

describe('summarizeOrigins', () => {
  it('counts by origin and high risk', () => {
    const pkgs = [
      makePkg('a', '^1.0.0'),
      makePkg('b', 'file:../b'),
      makePkg('c', 'user/repo'),
    ];
    const summary = summarizeOrigins(checkDependencyOrigins(pkgs));
    expect(summary.total).toBe(3);
    expect(summary.byOrigin.npm).toBe(1);
    expect(summary.byOrigin.local).toBe(1);
    expect(summary.byOrigin.github).toBe(1);
    expect(summary.highRisk).toBe(1);
  });
});
