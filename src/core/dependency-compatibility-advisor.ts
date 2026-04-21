/**
 * Dependency Compatibility Advisor
 *
 * Analyzes pairs of dependencies for known compatibility issues,
 * conflicting peer requirements, and version range overlaps.
 * Produces actionable advice for resolving incompatibilities.
 */

import semver from 'semver';
import { ParsedDependency } from '../types/index.js';

export type CompatibilityAdvice = 'compatible' | 'likely-compatible' | 'uncertain' | 'incompatible';

export interface CompatibilityAdvisory {
  packageA: string;
  packageB: string;
  versionA: string;
  versionB: string;
  advice: CompatibilityAdvice;
  reasons: string[];
  suggestion?: string;
}

export interface AdvisoryReport {
  advisories: CompatibilityAdvisory[];
  incompatibleCount: number;
  uncertainCount: number;
  compatibleCount: number;
  summary: string;
}

/** Known incompatible package pairs and the version ranges they conflict on. */
const KNOWN_CONFLICTS: Array<{
  a: string;
  b: string;
  aRange?: string;
  bRange?: string;
  note: string;
}> = [
  {
    a: 'react',
    b: 'react-dom',
    note: 'react and react-dom must share the same major version',
  },
  {
    a: 'webpack',
    b: 'vite',
    note: 'webpack and vite serve the same role; using both may cause conflicts',
  },
  {
    a: 'moment',
    b: 'date-fns',
    note: 'moment and date-fns overlap in functionality; prefer one to avoid bundle bloat',
  },
];

/** Determine whether two version strings are on the same major. */
function sameMajor(vA: string, vB: string): boolean {
  const coA = semver.coerce(vA);
  const coB = semver.coerce(vB);
  if (!coA || !coB) return false;
  return coA.major === coB.major;
}

/** Check known conflict table for a pair of packages. */
function findKnownConflict(
  nameA: string,
  nameB: string,
): (typeof KNOWN_CONFLICTS)[number] | undefined {
  return KNOWN_CONFLICTS.find(
    (c) =>
      (c.a === nameA && c.b === nameB) || (c.a === nameB && c.b === nameA),
  );
}

/** Build a single advisory entry for two dependencies. */
export function buildAdvisory(
  depA: ParsedDependency,
  depB: ParsedDependency,
): CompatibilityAdvisory {
  const reasons: string[] = [];
  let advice: CompatibilityAdvice = 'likely-compatible';
  let suggestion: string | undefined;

  const conflict = findKnownConflict(depA.name, depB.name);
  if (conflict) {
    reasons.push(conflict.note);
    // For react / react-dom, flag if majors differ
    if (
      (depA.name === 'react' || depA.name === 'react-dom') &&
      (depB.name === 'react' || depB.name === 'react-dom')
    ) {
      if (!sameMajor(depA.version, depB.version)) {
        advice = 'incompatible';
        suggestion = `Align both packages to the same major version (e.g. ${semver.coerce(depA.version)?.major}.x).`;
      } else {
        advice = 'compatible';
      }
    } else {
      advice = 'uncertain';
      suggestion = `Consider removing one of these packages to reduce overlap.`;
    }
  } else {
    advice = 'likely-compatible';
    reasons.push('No known conflicts detected between these packages.');
  }

  return {
    packageA: depA.name,
    packageB: depB.name,
    versionA: depA.version,
    versionB: depB.version,
    advice,
    reasons,
    suggestion,
  };
}

/** Analyze all dependency pairs and return a full advisory report. */
export function adviseCompatibility(
  dependencies: ParsedDependency[],
): AdvisoryReport {
  const advisories: CompatibilityAdvisory[] = [];

  for (let i = 0; i < dependencies.length; i++) {
    for (let j = i + 1; j < dependencies.length; j++) {
      const advisory = buildAdvisory(dependencies[i], dependencies[j]);
      // Only surface entries that are not trivially likely-compatible
      if (advisory.advice !== 'likely-compatible') {
        advisories.push(advisory);
      }
    }
  }

  const incompatibleCount = advisories.filter((a) => a.advice === 'incompatible').length;
  const uncertainCount = advisories.filter((a) => a.advice === 'uncertain').length;
  const compatibleCount = advisories.filter((a) => a.advice === 'compatible').length;

  const summary =
    advisories.length === 0
      ? 'No compatibility issues detected.'
      : `Found ${incompatibleCount} incompatible, ${uncertainCount} uncertain, and ${compatibleCount} compatible advisories across ${dependencies.length} dependencies.`;

  return { advisories, incompatibleCount, uncertainCount, compatibleCount, summary };
}
