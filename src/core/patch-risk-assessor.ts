import semver from 'semver';
import { DependencyInfo } from '../types/index.js';

export type PatchRiskLevel = 'safe' | 'low' | 'medium' | 'high';

export interface PatchRiskEntry {
  name: string;
  currentVersion: string;
  targetVersion: string;
  updateType: 'patch' | 'minor' | 'major' | 'unknown';
  riskLevel: PatchRiskLevel;
  reasons: string[];
}

export interface PatchRiskSummary {
  total: number;
  safe: number;
  low: number;
  medium: number;
  high: number;
}

export function classifyUpdateType(
  current: string,
  target: string
): PatchRiskEntry['updateType'] {
  const diff = semver.diff(current, target);
  if (diff === 'patch' || diff === 'prepatch') return 'patch';
  if (diff === 'minor' || diff === 'preminor') return 'minor';
  if (diff === 'major' || diff === 'premajor') return 'major';
  return 'unknown';
}

export function calcPatchRisk(
  updateType: PatchRiskEntry['updateType'],
  dep: DependencyInfo
): { riskLevel: PatchRiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (updateType === 'major') {
    score += 3;
    reasons.push('Major version bump — likely breaking changes');
  } else if (updateType === 'minor') {
    score += 1;
    reasons.push('Minor version bump — new features, generally safe');
  }

  if (dep.isDeprecated) {
    score += 2;
    reasons.push('Package is deprecated');
  }

  if (!dep.repositoryUrl) {
    score += 1;
    reasons.push('No repository URL — provenance unclear');
  }

  const riskLevel: PatchRiskLevel =
    score === 0 ? 'safe' : score === 1 ? 'low' : score <= 3 ? 'medium' : 'high';

  return { riskLevel, reasons };
}

export function buildPatchRiskEntry(
  dep: DependencyInfo,
  targetVersion: string
): PatchRiskEntry {
  const updateType = classifyUpdateType(dep.currentVersion, targetVersion);
  const { riskLevel, reasons } = calcPatchRisk(updateType, dep);
  return {
    name: dep.name,
    currentVersion: dep.currentVersion,
    targetVersion,
    updateType,
    riskLevel,
    reasons,
  };
}

export function assessPatchRisks(
  deps: DependencyInfo[],
  targetVersionMap: Record<string, string>
): { entries: PatchRiskEntry[]; summary: PatchRiskSummary } {
  const entries: PatchRiskEntry[] = deps
    .filter((d) => targetVersionMap[d.name])
    .map((d) => buildPatchRiskEntry(d, targetVersionMap[d.name]));

  const summary: PatchRiskSummary = {
    total: entries.length,
    safe: entries.filter((e) => e.riskLevel === 'safe').length,
    low: entries.filter((e) => e.riskLevel === 'low').length,
    medium: entries.filter((e) => e.riskLevel === 'medium').length,
    high: entries.filter((e) => e.riskLevel === 'high').length,
  };

  return { entries, summary };
}
