import { Dependency } from '../types';

export interface AliasEntry {
  name: string;
  alias: string;
  resolvedName: string;
  resolvedVersion: string;
  isAlias: boolean;
}

export interface AliasSummary {
  total: number;
  aliasCount: number;
  entries: AliasEntry[];
}

/**
 * Detects if a dependency name contains an npm alias pattern (name@npm:real-pkg).
 * package.json aliases look like: "my-alias": "npm:real-package@^1.0.0"
 */
export function isAliasedDependency(version: string): boolean {
  return version.startsWith('npm:');
}

/**
 * Parses an npm alias version string into its resolved name and version range.
 * e.g. "npm:real-package@^1.0.0" -> { resolvedName: 'real-package', resolvedVersion: '^1.0.0' }
 */
export function parseAliasVersion(
  version: string
): { resolvedName: string; resolvedVersion: string } | null {
  if (!isAliasedDependency(version)) return null;
  const withoutPrefix = version.slice(4); // remove 'npm:'
  const lastAt = withoutPrefix.lastIndexOf('@');
  if (lastAt <= 0) {
    return { resolvedName: withoutPrefix, resolvedVersion: 'latest' };
  }
  return {
    resolvedName: withoutPrefix.slice(0, lastAt),
    resolvedVersion: withoutPrefix.slice(lastAt + 1),
  };
}

export function buildAliasEntry(dep: Dependency): AliasEntry {
  const parsed = parseAliasVersion(dep.currentVersion);
  if (!parsed) {
    return {
      name: dep.name,
      alias: dep.name,
      resolvedName: dep.name,
      resolvedVersion: dep.currentVersion,
      isAlias: false,
    };
  }
  return {
    name: dep.name,
    alias: dep.name,
    resolvedName: parsed.resolvedName,
    resolvedVersion: parsed.resolvedVersion,
    isAlias: true,
  };
}

export function detectAliases(deps: Dependency[]): AliasSummary {
  const entries = deps.map(buildAliasEntry);
  const aliasCount = entries.filter((e) => e.isAlias).length;
  return { total: deps.length, aliasCount, entries };
}
