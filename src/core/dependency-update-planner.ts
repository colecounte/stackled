import semver from 'semver';
import { ParsedDependency } from '../types/index.js';

export type UpdateStrategy = 'patch-only' | 'minor-safe' | 'major-all' | 'security-only';

export interface UpdatePlan {
  name: string;
  currentVersion: string;
  targetVersion: string;
  updateType: 'patch' | 'minor' | 'major';
  strategy: UpdateStrategy;
  isSafe: boolean;
  reason: string;
}

export interface UpdatePlanSummary {
  total: number;
  safe: number;
  risky: number;
  skipped: number;
  plans: UpdatePlan[];
}

export function classifyUpdateType(from: string, to: string): 'patch' | 'minor' | 'major' {
  const diff = semver.diff(semver.coerce(from)?.version ?? from, semver.coerce(to)?.version ?? to);
  if (diff === 'major') return 'major';
  if (diff === 'minor' || diff === 'preminor') return 'minor';
  return 'patch';
}

export function isSafeUpdate(updateType: 'patch' | 'minor' | 'major', strategy: UpdateStrategy): boolean {
  if (strategy === 'patch-only') return updateType === 'patch';
  if (strategy === 'minor-safe') return updateType === 'patch' || updateType === 'minor';
  if (strategy === 'major-all') return true;
  return false; // security-only handled externally
}

export function buildUpdatePlan(
  dep: ParsedDependency,
  targetVersion: string,
  strategy: UpdateStrategy,
  isSecurityFix = false
): UpdatePlan {
  const current = semver.coerce(dep.version)?.version ?? dep.version;
  const target = semver.coerce(targetVersion)?.version ?? targetVersion;
  const updateType = classifyUpdateType(current, target);
  const safe =
    strategy === 'security-only' ? isSecurityFix : isSafeUpdate(updateType, strategy);

  return {
    name: dep.name,
    currentVersion: dep.version,
    targetVersion,
    updateType,
    strategy,
    isSafe: safe,
    reason: isSecurityFix
      ? 'Security fix available'
      : `${updateType} update within strategy '${strategy}'`,
  };
}

export function planUpdates(
  deps: ParsedDependency[],
  latestVersions: Record<string, string>,
  strategy: UpdateStrategy,
  securityPackages: Set<string> = new Set()
): UpdatePlanSummary {
  const plans: UpdatePlan[] = [];
  let skipped = 0;

  for (const dep of deps) {
    const latest = latestVersions[dep.name];
    if (!latest) { skipped++; continue; }
    const current = semver.coerce(dep.version)?.version;
    if (!current || !semver.gt(semver.coerce(latest)?.version ?? latest, current)) {
      skipped++;
      continue;
    }
    plans.push(buildUpdatePlan(dep, latest, strategy, securityPackages.has(dep.name)));
  }

  return {
    total: plans.length,
    safe: plans.filter(p => p.isSafe).length,
    risky: plans.filter(p => !p.isSafe).length,
    skipped,
    plans,
  };
}
