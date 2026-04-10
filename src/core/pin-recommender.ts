import semver from 'semver';
import { DependencyInfo } from '../types/index';

export type PinStrategy = 'exact' | 'patch' | 'minor' | 'none';

export interface PinRecommendation {
  name: string;
  current: string;
  recommended: string;
  strategy: PinStrategy;
  reason: string;
}

export function suggestStrategy(dep: DependencyInfo): PinStrategy {
  const { current, latestStable } = dep;
  if (!current || !latestStable) return 'none';
  const diff = semver.diff(semver.coerce(current)?.version ?? current, latestStable);
  if (diff === 'major') return 'minor';
  if (dep.hasBreakingChanges) return 'patch';
  if (dep.vulnerabilities && dep.vulnerabilities.length > 0) return 'exact';
  return 'minor';
}

export function buildPinRecommendation(dep: DependencyInfo): PinRecommendation {
  const strategy = suggestStrategy(dep);
  const base = semver.coerce(dep.current)?.version ?? dep.current;

  const recommended = (() => {
    if (strategy === 'exact') return dep.current;
    if (strategy === 'patch') return `~${base}`;
    if (strategy === 'minor') return `^${base}`;
    return dep.current;
  })();

  const reason = (() => {
    if (strategy === 'exact') return 'Pinned exactly due to known vulnerabilities';
    if (strategy === 'patch') return 'Patch-range recommended due to breaking changes detected';
    if (strategy === 'minor') return 'Minor-range recommended for safe updates';
    return 'No change recommended';
  })();

  return { name: dep.name, current: dep.current, recommended, strategy, reason };
}

export function recommendPins(deps: DependencyInfo[]): PinRecommendation[] {
  return deps.map(buildPinRecommendation);
}
