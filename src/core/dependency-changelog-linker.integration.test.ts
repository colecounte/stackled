import {
  buildNpmUrl,
  resolveChangelogUrl,
  linkDependencyChangelogs,
} from './dependency-changelog-linker';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version, currentVersion: version, latestVersion: version };
}

describe('dependency-changelog-linker integration', () => {
  it('produces consistent npm urls for scoped packages', () => {
    const url = buildNpmUrl('@babel/core', '7.22.0');
    expect(url).toMatch(/npmjs\.com\/package\/@babel%2Fcore\/v\/7\.22\.0/);
  });

  it('full pipeline: packages without repos have no changelog', () => {
    const packages = [makePkg('no-repo-pkg', '2.0.0')];
    const result = linkDependencyChangelogs(packages, { 'no-repo-pkg': null });
    expect(result.coveragePercent).toBe(0);
    expect(result.links[0].hasChangelog).toBe(false);
    expect(result.links[0].npmUrl).toContain('no-repo-pkg');
  });

  it('full pipeline: 100% coverage when all have github repos', () => {
    const packages = [
      makePkg('react', '18.2.0'),
      makePkg('react-dom', '18.2.0'),
    ];
    const repoMap = {
      react: 'https://github.com/facebook/react',
      'react-dom': 'https://github.com/facebook/react',
    };
    const result = linkDependencyChangelogs(packages, repoMap);
    expect(result.coveragePercent).toBe(100);
    expect(result.withoutChangelog).toBe(0);
  });

  it('resolves changelog url stripping .git suffix', () => {
    const url = resolveChangelogUrl(
      'git+https://github.com/sindresorhus/got.git',
      'got',
      '12.0.0'
    );
    expect(url).not.toBeNull();
    expect(url).not.toContain('.git/blob');
    expect(url).toContain('sindresorhus/got');
  });

  it('mixed coverage calculates percent correctly', () => {
    const packages = Array.from({ length: 4 }, (_, i) => makePkg(`pkg-${i}`, '1.0.0'));
    const repoMap: Record<string, string | null> = {
      'pkg-0': 'https://github.com/owner/pkg-0',
      'pkg-1': null,
      'pkg-2': 'https://github.com/owner/pkg-2',
      'pkg-3': null,
    };
    const result = linkDependencyChangelogs(packages, repoMap);
    expect(result.withChangelog).toBe(2);
    expect(result.coveragePercent).toBe(50);
  });
});
