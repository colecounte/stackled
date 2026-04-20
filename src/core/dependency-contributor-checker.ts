import { PackageInfo } from '../types';

export interface ContributorEntry {
  name: string;
  version: string;
  contributorCount: number;
  topContributor: string | null;
  isOrgBacked: boolean;
  risk: 'low' | 'medium' | 'high';
  flags: string[];
}

export interface ContributorSummary {
  total: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
}

export function classifyContributorRisk(
  contributorCount: number,
  isOrgBacked: boolean
): 'low' | 'medium' | 'high' {
  if (contributorCount === 0) return 'high';
  if (!isOrgBacked && contributorCount === 1) return 'high';
  if (contributorCount < 3 && !isOrgBacked) return 'medium';
  return 'low';
}

export function buildContributorFlags(
  contributorCount: number,
  isOrgBacked: boolean
): string[] {
  const flags: string[] = [];
  if (contributorCount === 0) flags.push('no-contributors');
  if (!isOrgBacked && contributorCount === 1) flags.push('single-contributor');
  if (!isOrgBacked) flags.push('no-org-backing');
  if (contributorCount >= 10) flags.push('large-contributor-base');
  return flags;
}

export function buildContributorEntry(
  pkg: PackageInfo,
  contributors: Array<{ name: string }>
): ContributorEntry {
  const count = contributors.length;
  const isOrgBacked = pkg.name.startsWith('@');
  const risk = classifyContributorRisk(count, isOrgBacked);
  const flags = buildContributorFlags(count, isOrgBacked);
  const topContributor = contributors[0]?.name ?? null;

  return {
    name: pkg.name,
    version: pkg.version,
    contributorCount: count,
    topContributor,
    isOrgBacked,
    risk,
    flags,
  };
}

export function checkDependencyContributors(
  packages: PackageInfo[],
  contributorMap: Record<string, Array<{ name: string }>>
): ContributorEntry[] {
  return packages.map((pkg) => {
    const contributors = contributorMap[pkg.name] ?? [];
    return buildContributorEntry(pkg, contributors);
  });
}

export function summarizeContributors(
  entries: ContributorEntry[]
): ContributorSummary {
  return {
    total: entries.length,
    lowRisk: entries.filter((e) => e.risk === 'low').length,
    mediumRisk: entries.filter((e) => e.risk === 'medium').length,
    highRisk: entries.filter((e) => e.risk === 'high').length,
  };
}
