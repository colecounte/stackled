import {
  buildNpmUrl,
  resolveChangelogUrl,
  buildChangelogLink,
  linkDependencyChangelogs,
  ChangelogLink,
} from './dependency-changelog-linker';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version, currentVersion: version, latestVersion: version };
}

describe('buildNpmUrl', () => {
  it('builds url for unscoped package', () => {
    expect(buildNpmUrl('express', '4.18.0')).toBe(
      'https://www.npmjs.com/package/express/v/4.18.0'
    );
  });

  it('encodes scoped package name', () => {
    expect(buildNpmUrl('@types/node', '18.0.0')).toContain('%2F');
  });
});

describe('resolveChangelogUrl', () => {
  it('returns null when no repositoryUrl', () => {
    expect(resolveChangelogUrl(null, 'pkg', '1.0.0')).toBeNull();
  });

  it('resolves github https url', () => {
    const url = resolveChangelogUrl(
      'https://github.com/expressjs/express',
      'express',
      '4.18.0'
    );
    expect(url).toContain('github.com/expressjs/express');
    expect(url).toContain('CHANGELOG.md');
  });

  it('resolves github git url', () => {
    const url = resolveChangelogUrl(
      'git+https://github.com/owner/repo.git',
      'pkg',
      '1.0.0'
    );
    expect(url).toContain('github.com/owner/repo');
    expect(url).not.toContain('.git');
  });

  it('returns null for non-github url', () => {
    const url = resolveChangelogUrl(
      'https://gitlab.com/owner/repo',
      'pkg',
      '1.0.0'
    );
    expect(url).toBeNull();
  });
});

describe('buildChangelogLink', () => {
  it('marks hasChangelog true when github repo present', () => {
    const pkg = makePkg('express', '4.18.0');
    const link = buildChangelogLink(pkg, 'https://github.com/expressjs/express');
    expect(link.hasChangelog).toBe(true);
    expect(link.name).toBe('express');
    expect(link.npmUrl).toContain('npmjs.com');
  });

  it('marks hasChangelog false when no repo', () => {
    const pkg = makePkg('mystery-pkg', '1.0.0');
    const link = buildChangelogLink(pkg, null);
    expect(link.hasChangelog).toBe(false);
    expect(link.changelogUrl).toBeNull();
  });
});

describe('linkDependencyChangelogs', () => {
  const packages = [
    makePkg('express', '4.18.0'),
    makePkg('lodash', '4.17.21'),
    makePkg('unknown-lib', '1.0.0'),
  ];
  const repoMap: Record<string, string | null> = {
    express: 'https://github.com/expressjs/express',
    lodash: 'https://github.com/lodash/lodash',
    'unknown-lib': null,
  };

  it('calculates coverage percent', () => {
    const result = linkDependencyChangelogs(packages, repoMap);
    expect(result.withChangelog).toBe(2);
    expect(result.withoutChangelog).toBe(1);
    expect(result.coveragePercent).toBe(67);
  });

  it('returns empty result for no packages', () => {
    const result = linkDependencyChangelogs([], {});
    expect(result.coveragePercent).toBe(0);
    expect(result.links).toHaveLength(0);
  });
});
