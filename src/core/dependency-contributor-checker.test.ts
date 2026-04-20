import {
  classifyContributorRisk,
  buildContributorFlags,
  buildContributorEntry,
  checkDependencyContributors,
  summarizeContributors,
} from './dependency-contributor-checker';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version, description: '', dependencies: {}, devDependencies: {} } as PackageInfo;
}

describe('classifyContributorRisk', () => {
  it('returns high when no contributors', () => {
    expect(classifyContributorRisk(0, false)).toBe('high');
  });

  it('returns high for solo unorganized package', () => {
    expect(classifyContributorRisk(1, false)).toBe('high');
  });

  it('returns medium for 2 contributors without org', () => {
    expect(classifyContributorRisk(2, false)).toBe('medium');
  });

  it('returns low for org-backed single contributor', () => {
    expect(classifyContributorRisk(1, true)).toBe('low');
  });

  it('returns low for many contributors', () => {
    expect(classifyContributorRisk(10, false)).toBe('low');
  });
});

describe('buildContributorFlags', () => {
  it('flags no-contributors when count is 0', () => {
    expect(buildContributorFlags(0, false)).toContain('no-contributors');
  });

  it('flags single-contributor for solo non-org', () => {
    expect(buildContributorFlags(1, false)).toContain('single-contributor');
  });

  it('flags no-org-backing for non-scoped packages', () => {
    expect(buildContributorFlags(2, false)).toContain('no-org-backing');
  });

  it('flags large-contributor-base for 10+', () => {
    expect(buildContributorFlags(10, false)).toContain('large-contributor-base');
  });

  it('returns no flags for healthy org-backed package', () => {
    const flags = buildContributorFlags(5, true);
    expect(flags).toHaveLength(0);
  });
});

describe('buildContributorEntry', () => {
  it('builds entry with correct contributor count', () => {
    const pkg = makePkg('lodash');
    const contributors = [{ name: 'alice' }, { name: 'bob' }, { name: 'carol' }];
    const entry = buildContributorEntry(pkg, contributors);
    expect(entry.contributorCount).toBe(3);
    expect(entry.topContributor).toBe('alice');
    expect(entry.isOrgBacked).toBe(false);
  });

  it('detects org-backed scoped package', () => {
    const pkg = makePkg('@angular/core');
    const entry = buildContributorEntry(pkg, [{ name: 'team' }]);
    expect(entry.isOrgBacked).toBe(true);
    expect(entry.risk).toBe('low');
  });

  it('sets topContributor to null when empty', () => {
    const pkg = makePkg('tiny-lib');
    const entry = buildContributorEntry(pkg, []);
    expect(entry.topContributor).toBeNull();
    expect(entry.risk).toBe('high');
  });
});

describe('checkDependencyContributors', () => {
  it('maps packages to contributor entries', () => {
    const pkgs = [makePkg('react'), makePkg('vue')];
    const map = {
      react: [{ name: 'gaearon' }, { name: 'acdlite' }],
      vue: [{ name: 'yyx990803' }],
    };
    const entries = checkDependencyContributors(pkgs, map);
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('react');
    expect(entries[1].contributorCount).toBe(1);
  });

  it('handles missing contributor data gracefully', () => {
    const pkgs = [makePkg('unknown-pkg')];
    const entries = checkDependencyContributors(pkgs, {});
    expect(entries[0].contributorCount).toBe(0);
    expect(entries[0].risk).toBe('high');
  });
});

describe('summarizeContributors', () => {
  it('counts risk levels correctly', () => {
    const entries = [
      { risk: 'low' },
      { risk: 'medium' },
      { risk: 'high' },
      { risk: 'high' },
    ] as any;
    const summary = summarizeContributors(entries);
    expect(summary.total).toBe(4);
    expect(summary.lowRisk).toBe(1);
    expect(summary.mediumRisk).toBe(1);
    expect(summary.highRisk).toBe(2);
  });
});
