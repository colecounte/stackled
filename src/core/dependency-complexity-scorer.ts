import { ParsedDependency } from '../types';

export interface ComplexityEntry {
  name: string;
  version: string;
  transitiveCount: number;
  depthScore: number;
  versionSpread: number;
  complexityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ComplexitySummary {
  entries: ComplexityEntry[];
  averageScore: number;
  mostComplex: string | null;
  highComplexityCount: number;
}

export function gradeFromComplexity(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score <= 20) return 'A';
  if (score <= 40) return 'B';
  if (score <= 60) return 'C';
  if (score <= 80) return 'D';
  return 'F';
}

export function calcDepthScore(depth: number): number {
  return Math.min(depth * 10, 50);
}

export function calcVersionSpreadScore(versions: string[]): number {
  const unique = new Set(versions).size;
  return Math.min(unique * 5, 30);
}

export function calcComplexityScore(
  transitiveCount: number,
  depthScore: number,
  versionSpread: number
): number {
  const transitiveScore = Math.min(transitiveCount * 2, 40);
  return Math.round((transitiveScore + depthScore + versionSpread) / 3);
}

export function buildComplexityEntry(
  dep: ParsedDependency,
  transitiveCount: number,
  maxDepth: number,
  allVersions: string[]
): ComplexityEntry {
  const depthScore = calcDepthScore(maxDepth);
  const versionSpread = calcVersionSpreadScore(allVersions);
  const complexityScore = calcComplexityScore(transitiveCount, depthScore, versionSpread);
  return {
    name: dep.name,
    version: dep.version,
    transitiveCount,
    depthScore,
    versionSpread,
    complexityScore,
    grade: gradeFromComplexity(complexityScore),
  };
}

export function scoreDependencyComplexity(
  deps: ParsedDependency[],
  transitiveMap: Record<string, number>,
  depthMap: Record<string, number>,
  versionMap: Record<string, string[]>
): ComplexitySummary {
  const entries = deps.map((dep) =>
    buildComplexityEntry(
      dep,
      transitiveMap[dep.name] ?? 0,
      depthMap[dep.name] ?? 0,
      versionMap[dep.name] ?? [dep.version]
    )
  );

  const total = entries.reduce((sum, e) => sum + e.complexityScore, 0);
  const averageScore = entries.length > 0 ? Math.round(total / entries.length) : 0;
  const highComplexityCount = entries.filter((e) => e.grade === 'D' || e.grade === 'F').length;
  const mostComplex =
    entries.length > 0
      ? entries.reduce((a, b) => (a.complexityScore > b.complexityScore ? a : b)).name
      : null;

  return { entries, averageScore, mostComplex, highComplexityCount };
}
