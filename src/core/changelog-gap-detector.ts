import { ChangelogSummary } from '../types';

export interface ChangelogGap {
  name: string;
  installedVersion: string;
  latestVersion: string;
  missingVersions: string[];
  gapCount: number;
  severity: 'low' | 'medium' | 'high';
}

export interface GapDetectionResult {
  gaps: ChangelogGap[];
  totalMissing: number;
  affectedPackages: number;
}

export function classifyGapSeverity(
  gapCount: number
): 'low' | 'medium' | 'high' {
  if (gapCount >= 5) return 'high';
  if (gapCount >= 2) return 'medium';
  return 'low';
}

export function findMissingVersions(
  installedVersion: string,
  latestVersion: string,
  availableVersions: string[]
): string[] {
  const { gt, lte } = require('semver');
  return availableVersions.filter(
    (v) => gt(v, installedVersion) && lte(v, latestVersion)
  );
}

export function buildGap(
  name: string,
  installedVersion: string,
  latestVersion: string,
  availableVersions: string[]
): ChangelogGap {
  const missingVersions = findMissingVersions(
    installedVersion,
    latestVersion,
    availableVersions
  );
  return {
    name,
    installedVersion,
    latestVersion,
    missingVersions,
    gapCount: missingVersions.length,
    severity: classifyGapSeverity(missingVersions.length),
  };
}

export function detectChangelogGaps(
  packages: Array<{
    name: string;
    installedVersion: string;
    latestVersion: string;
    availableVersions: string[];
  }>
): GapDetectionResult {
  const gaps: ChangelogGap[] = packages
    .map((p) =>
      buildGap(p.name, p.installedVersion, p.latestVersion, p.availableVersions)
    )
    .filter((g) => g.gapCount > 0);

  return {
    gaps,
    totalMissing: gaps.reduce((sum, g) => sum + g.gapCount, 0),
    affectedPackages: gaps.length,
  };
}

export function summarizeGaps(result: GapDetectionResult): string {
  if (result.affectedPackages === 0) return 'No changelog gaps detected.';
  return (
    `${result.affectedPackages} package(s) have changelog gaps ` +
    `(${result.totalMissing} missing version(s) total).`
  );
}
