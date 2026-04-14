import { PackageInfo } from '../types';

export interface ForkEntry {
  name: string;
  currentVersion: string;
  repositoryUrl: string | null;
  isFork: boolean;
  parentUrl: string | null;
  forkRisk: 'low' | 'medium' | 'high';
  flags: string[];
}

export interface ForkSummary {
  total: number;
  forks: number;
  highRisk: number;
}

export function classifyForkRisk(
  isFork: boolean,
  stars: number | undefined,
  openIssues: number | undefined
): 'low' | 'medium' | 'high' {
  if (!isFork) return 'low';
  if ((stars ?? 0) < 10) return 'high';
  if ((openIssues ?? 0) > 50) return 'medium';
  return 'medium';
}

export function buildForkFlags(
  isFork: boolean,
  stars: number | undefined,
  openIssues: number | undefined
): string[] {
  const flags: string[] = [];
  if (isFork) flags.push('forked-repo');
  if (isFork && (stars ?? 0) < 10) flags.push('low-stars');
  if (isFork && (openIssues ?? 0) > 50) flags.push('high-open-issues');
  return flags;
}

export function buildForkEntry(pkg: PackageInfo): ForkEntry {
  const repoMeta = pkg.repositoryMeta as {
    isFork?: boolean;
    parentUrl?: string;
    stars?: number;
    openIssues?: number;
  } | undefined;

  const isFork = repoMeta?.isFork ?? false;
  const parentUrl = repoMeta?.parentUrl ?? null;
  const stars = repoMeta?.stars;
  const openIssues = repoMeta?.openIssues;

  return {
    name: pkg.name,
    currentVersion: pkg.version,
    repositoryUrl: pkg.repositoryUrl ?? null,
    isFork,
    parentUrl,
    forkRisk: classifyForkRisk(isFork, stars, openIssues),
    flags: buildForkFlags(isFork, stars, openIssues),
  };
}

export function detectForks(packages: PackageInfo[]): ForkEntry[] {
  return packages.map(buildForkEntry);
}

export function summarizeForks(entries: ForkEntry[]): ForkSummary {
  return {
    total: entries.length,
    forks: entries.filter((e) => e.isFork).length,
    highRisk: entries.filter((e) => e.forkRisk === 'high').length,
  };
}
