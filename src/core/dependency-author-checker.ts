import { PackageInfo } from '../types';

export interface AuthorEntry {
  name: string;
  author: string;
  authorEmail: string | null;
  isOrg: boolean;
  numMaintainers: number;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
}

export interface AuthorSummary {
  total: number;
  highRisk: number;
  singleMaintainer: number;
  noAuthor: number;
}

export function classifyAuthorRisk(
  author: string | null,
  numMaintainers: number
): 'low' | 'medium' | 'high' {
  if (!author) return 'high';
  if (numMaintainers === 1) return 'medium';
  if (numMaintainers === 0) return 'high';
  return 'low';
}

export function buildAuthorFlags(
  author: string | null,
  numMaintainers: number
): string[] {
  const flags: string[] = [];
  if (!author) flags.push('no-author');
  if (numMaintainers === 0) flags.push('no-maintainers');
  if (numMaintainers === 1) flags.push('single-maintainer');
  return flags;
}

export function isOrgAuthor(author: string): boolean {
  return /\binc\b|\bllc\b|\bcorp\b|\bteam\b|\bgroup\b/i.test(author);
}

export function buildAuthorEntry(pkg: PackageInfo): AuthorEntry {
  const author = pkg.author ?? null;
  const maintainers = Array.isArray(pkg.maintainers) ? pkg.maintainers : [];
  const numMaintainers = maintainers.length;
  const riskLevel = classifyAuthorRisk(author, numMaintainers);
  const flags = buildAuthorFlags(author, numMaintainers);
  const authorEmail = pkg.authorEmail ?? null;

  return {
    name: pkg.name,
    author: author ?? 'unknown',
    authorEmail,
    isOrg: author ? isOrgAuthor(author) : false,
    numMaintainers,
    riskLevel,
    flags,
  };
}

export function checkDependencyAuthors(packages: PackageInfo[]): AuthorEntry[] {
  return packages.map(buildAuthorEntry);
}

export function summarizeAuthors(entries: AuthorEntry[]): AuthorSummary {
  return {
    total: entries.length,
    highRisk: entries.filter((e) => e.riskLevel === 'high').length,
    singleMaintainer: entries.filter((e) => e.numMaintainers === 1).length,
    noAuthor: entries.filter((e) => e.author === 'unknown').length,
  };
}
