import {
  isAliasedDependency,
  parseAliasVersion,
  buildAliasEntry,
  detectAliases,
} from './alias-detector';
import { Dependency } from '../types';

function makeDep(name: string, version: string): Dependency {
  return {
    name,
    currentVersion: version,
    latestVersion: version,
    type: 'production',
  } as Dependency;
}

describe('isAliasedDependency', () => {
  it('returns true for npm: prefixed versions', () => {
    expect(isAliasedDependency('npm:lodash@^4.0.0')).toBe(true);
  });

  it('returns false for normal semver versions', () => {
    expect(isAliasedDependency('^4.0.0')).toBe(false);
    expect(isAliasedDependency('1.2.3')).toBe(false);
  });

  it('returns false for git or url versions', () => {
    expect(isAliasedDependency('github:user/repo')).toBe(false);
  });
});

describe('parseAliasVersion', () => {
  it('parses a full alias with version range', () => {
    const result = parseAliasVersion('npm:real-package@^1.0.0');
    expect(result).toEqual({ resolvedName: 'real-package', resolvedVersion: '^1.0.0' });
  });

  it('parses alias without version as latest', () => {
    const result = parseAliasVersion('npm:some-package');
    expect(result).toEqual({ resolvedName: 'some-package', resolvedVersion: 'latest' });
  });

  it('handles scoped packages', () => {
    const result = parseAliasVersion('npm:@scope/pkg@2.0.0');
    expect(result).toEqual({ resolvedName: '@scope/pkg', resolvedVersion: '2.0.0' });
  });

  it('returns null for non-alias versions', () => {
    expect(parseAliasVersion('^1.0.0')).toBeNull();
  });
});

describe('buildAliasEntry', () => {
  it('marks aliased dependency correctly', () => {
    const dep = makeDep('my-lodash', 'npm:lodash@^4.17.0');
    const entry = buildAliasEntry(dep);
    expect(entry.isAlias).toBe(true);
    expect(entry.alias).toBe('my-lodash');
    expect(entry.resolvedName).toBe('lodash');
    expect(entry.resolvedVersion).toBe('^4.17.0');
  });

  it('marks normal dependency as not aliased', () => {
    const dep = makeDep('lodash', '^4.17.0');
    const entry = buildAliasEntry(dep);
    expect(entry.isAlias).toBe(false);
    expect(entry.resolvedName).toBe('lodash');
    expect(entry.resolvedVersion).toBe('^4.17.0');
  });
});

describe('detectAliases', () => {
  it('returns correct summary counts', () => {
    const deps = [
      makeDep('my-lodash', 'npm:lodash@^4.0.0'),
      makeDep('react', '^18.0.0'),
      makeDep('my-react', 'npm:react@^17.0.0'),
    ];
    const summary = detectAliases(deps);
    expect(summary.total).toBe(3);
    expect(summary.aliasCount).toBe(2);
    expect(summary.entries).toHaveLength(3);
  });

  it('returns zero aliases for plain deps', () => {
    const deps = [makeDep('react', '^18.0.0'), makeDep('lodash', '^4.0.0')];
    const summary = detectAliases(deps);
    expect(summary.aliasCount).toBe(0);
  });

  it('handles empty array', () => {
    const summary = detectAliases([]);
    expect(summary.total).toBe(0);
    expect(summary.aliasCount).toBe(0);
  });
});
