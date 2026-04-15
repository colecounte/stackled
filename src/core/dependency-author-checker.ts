export interface AuthorInfo {
  name?: string;
  email?: string;
  url?: string;
}

export interface PackageAuthorInfo {
  name: string;
  version: string;
  author?: AuthorInfo | string;
  maintainers?: AuthorInfo[];
  repository?: { type?: string; url?: string } | string;
}

export interface AuthorEntry {
  name: string;
  version: string;
  authorName: string | null;
  maintainerCount: number;
  hasRepository: boolean;
  isOrgBacked: boolean;
  risk: 'low' | 'medium' | 'high';
  flags: string[];
}

export function isOrgAuthor(pkg: PackageAuthorInfo): boolean {
  const repoUrl =
    typeof pkg.repository === 'string'
      ? pkg.repository
      : pkg.repository?.url ?? '';
  return repoUrl.length > 0;
}

export function buildAuthorFlags(pkg: PackageAuthorInfo): string[] {
  const flags: string[] = [];

  if (!pkg.author) flags.push('no-author');

  const maintainerCount = pkg.maintainers?.length ?? 0;
  if (maintainerCount <= 1) flags.push('single-maintainer');

  const repoUrl =
    typeof pkg.repository === 'string'
      ? pkg.repository
      : pkg.repository?.url ?? '';
  if (!repoUrl) flags.push('no-repository');

  return flags;
}

export function classifyAuthorRisk(flags: string[]): 'low' | 'medium' | 'high' {
  if (flags.includes('no-author') && flags.includes('no-repository')) return 'high';
  if (flags.includes('no-author') || flags.includes('no-repository')) return 'high';
  if (flags.includes('single-maintainer')) return 'medium';
  return 'low';
}

export function buildAuthorEntry(
  name: string,
  version: string,
  pkg: PackageAuthorInfo,
): AuthorEntry {
  const flags = buildAuthorFlags(pkg);
  const risk = classifyAuthorRisk(flags);
  const authorName =
    typeof pkg.author === 'string'
      ? pkg.author
      : pkg.author?.name ?? null;
  const repoUrl =
    typeof pkg.repository === 'string'
      ? pkg.repository
      : pkg.repository?.url ?? '';

  return {
    name,
    version,
    authorName,
    maintainerCount: pkg.maintainers?.length ?? 0,
    hasRepository: repoUrl.length > 0,
    isOrgBacked: isOrgAuthor(pkg),
    risk,
    flags,
  };
}

export function checkDependencyAuthors(
  deps: Array<{ name: string; version: string; packageInfo: PackageAuthorInfo }>,
): AuthorEntry[] {
  return deps.map((d) => buildAuthorEntry(d.name, d.version, d.packageInfo));
}

export function summarizeAuthors(entries: AuthorEntry[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    total: entries.length,
    high: entries.filter((e) => e.risk === 'high').length,
    medium: entries.filter((e) => e.risk === 'medium').length,
    low: entries.filter((e) => e.risk === 'low').length,
  };
}
