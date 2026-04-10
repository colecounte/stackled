import semver from 'semver';
import { ParsedPackage, DependencyInfo } from '../types/index';

export interface PeerDependencyIssue {
  package: string;
  peerDep: string;
  required: string;
  installed: string | null;
  compatible: boolean;
  missing: boolean;
}

export interface PeerDependencyReport {
  issues: PeerDependencyIssue[];
  missingCount: number;
  incompatibleCount: number;
  hasIssues: boolean;
}

export function checkPeerCompatibility(
  peerRange: string,
  installedVersion: string | null
): boolean {
  if (!installedVersion) return false;
  const coerced = semver.coerce(installedVersion);
  if (!coerced) return false;
  return semver.satisfies(coerced, peerRange);
}

export function buildPeerIssue(
  packageName: string,
  peerDep: string,
  required: string,
  installedVersion: string | null
): PeerDependencyIssue {
  const missing = installedVersion === null;
  const compatible = missing ? false : checkPeerCompatibility(required, installedVersion);
  return {
    package: packageName,
    peerDep,
    required,
    installed: installedVersion,
    compatible,
    missing,
  };
}

export function checkPeerDependencies(
  packages: ParsedPackage[],
  installedMap: Record<string, string>
): PeerDependencyReport {
  const issues: PeerDependencyIssue[] = [];

  for (const pkg of packages) {
    if (!pkg.peerDependencies) continue;
    for (const [peer, range] of Object.entries(pkg.peerDependencies)) {
      const installed = installedMap[peer] ?? null;
      const issue = buildPeerIssue(pkg.name, peer, range as string, installed);
      if (issue.missing || !issue.compatible) {
        issues.push(issue);
      }
    }
  }

  return {
    issues,
    missingCount: issues.filter((i) => i.missing).length,
    incompatibleCount: issues.filter((i) => !i.missing && !i.compatible).length,
    hasIssues: issues.length > 0,
  };
}
