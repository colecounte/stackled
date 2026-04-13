import { PackageInfo } from '../types';

export type LifecycleStage =
  | 'incubating'
  | 'active'
  | 'mature'
  | 'maintenance'
  | 'deprecated'
  | 'abandoned';

export interface LifecycleEntry {
  name: string;
  version: string;
  stage: LifecycleStage;
  ageInDays: number;
  daysSinceLastRelease: number;
  releaseCount: number;
  score: number;
  reason: string;
}

export interface LifecycleSummary {
  total: number;
  byStage: Record<LifecycleStage, number>;
  abandoned: string[];
  deprecated: string[];
}

export function classifyLifecycleStage(
  ageInDays: number,
  daysSinceLastRelease: number,
  releaseCount: number,
  isDeprecated: boolean
): LifecycleStage {
  if (isDeprecated) return 'deprecated';
  if (daysSinceLastRelease > 730) return 'abandoned';
  if (daysSinceLastRelease > 365) return 'maintenance';
  if (ageInDays < 180 && releaseCount < 10) return 'incubating';
  if (ageInDays > 1095 && releaseCount > 50) return 'mature';
  return 'active';
}

export function calcLifecycleScore(
  stage: LifecycleStage,
  daysSinceLastRelease: number
): number {
  const stageBase: Record<LifecycleStage, number> = {
    incubating: 60,
    active: 90,
    mature: 85,
    maintenance: 55,
    deprecated: 20,
    abandoned: 10,
  };
  const recencyPenalty = Math.min(30, Math.floor(daysSinceLastRelease / 30));
  return Math.max(0, stageBase[stage] - recencyPenalty);
}

export function buildLifecycleEntry(
  pkg: PackageInfo,
  nowMs: number = Date.now()
): LifecycleEntry {
  const created = pkg.created ? new Date(pkg.created).getTime() : nowMs;
  const lastRelease = pkg.lastPublish ? new Date(pkg.lastPublish).getTime() : nowMs;
  const ageInDays = Math.floor((nowMs - created) / 86_400_000);
  const daysSinceLastRelease = Math.floor((nowMs - lastRelease) / 86_400_000);
  const releaseCount = pkg.versions?.length ?? 1;
  const isDeprecated = !!pkg.deprecated;
  const stage = classifyLifecycleStage(ageInDays, daysSinceLastRelease, releaseCount, isDeprecated);
  const score = calcLifecycleScore(stage, daysSinceLastRelease);
  const reason = isDeprecated
    ? 'Package is marked deprecated'
    : daysSinceLastRelease > 730
    ? `No release in ${daysSinceLastRelease} days`
    : `Stage: ${stage}`;
  return { name: pkg.name, version: pkg.version, stage, ageInDays, daysSinceLastRelease, releaseCount, score, reason };
}

export function trackDependencyLifecycles(
  packages: PackageInfo[],
  nowMs?: number
): { entries: LifecycleEntry[]; summary: LifecycleSummary } {
  const entries = packages.map((p) => buildLifecycleEntry(p, nowMs));
  const byStage = {} as Record<LifecycleStage, number>;
  for (const e of entries) byStage[e.stage] = (byStage[e.stage] ?? 0) + 1;
  const abandoned = entries.filter((e) => e.stage === 'abandoned').map((e) => e.name);
  const deprecated = entries.filter((e) => e.stage === 'deprecated').map((e) => e.name);
  return { entries, summary: { total: entries.length, byStage, abandoned, deprecated } };
}
