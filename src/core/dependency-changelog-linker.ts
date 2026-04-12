import { PackageInfo } from '../types';
import { ChangelogSummary } from '../types';

export interface ChangelogLink {
  name: string;
  version: string;
  changelogUrl: string | null;
  repositoryUrl: string | null;
  npmUrl: string;
  hasChangelog: boolean;
}

export interface ChangelogLinkerResult {
  links: ChangelogLink[];
  withChangelog: number;
  withoutChangelog: number;
  coveragePercent: number;
}

export function buildNpmUrl(name: string, version: string): string {
  const encodedName = name.startsWith('@')
    ? name.replace('/', '%2F')
    : name;
  return `https://www.npmjs.com/package/${encodedName}/v/${version}`;
}

export function resolveChangelogUrl(
  repositoryUrl: string | null,
  name: string,
  version: string
): string | null {
  if (!repositoryUrl) return null;
  const ghMatch = repositoryUrl.match(
    /github\.com[/:]([\w.-]+)\/([\w.-]+)/
  );
  if (ghMatch) {
    const [, owner, repo] = ghMatch;
    const cleanRepo = repo.replace(/\.git$/, '');
    return `https://github.com/${owner}/${cleanRepo}/blob/main/CHANGELOG.md`;
  }
  return null;
}

export function buildChangelogLink(
  pkg: PackageInfo,
  repositoryUrl: string | null
): ChangelogLink {
  const changelogUrl = resolveChangelogUrl(repositoryUrl, pkg.name, pkg.version);
  return {
    name: pkg.name,
    version: pkg.version,
    changelogUrl,
    repositoryUrl,
    npmUrl: buildNpmUrl(pkg.name, pkg.version),
    hasChangelog: changelogUrl !== null,
  };
}

export function linkDependencyChangelogs(
  packages: PackageInfo[],
  repositoryMap: Record<string, string | null>
): ChangelogLinkerResult {
  const links = packages.map((pkg) =>
    buildChangelogLink(pkg, repositoryMap[pkg.name] ?? null)
  );
  const withChangelog = links.filter((l) => l.hasChangelog).length;
  const withoutChangelog = links.length - withChangelog;
  const coveragePercent =
    links.length > 0
      ? Math.round((withChangelog / links.length) * 100)
      : 0;
  return { links, withChangelog, withoutChangelog, coveragePercent };
}
