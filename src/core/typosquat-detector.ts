import { ParsedDependency } from '../types';

export interface TyposquatResult {
  name: string;
  suspectedTarget: string;
  similarity: number;
  risk: 'high' | 'medium' | 'low';
  reason: string;
}

export interface TyposquatSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

const POPULAR_PACKAGES = [
  'react', 'lodash', 'express', 'axios', 'webpack', 'babel',
  'typescript', 'eslint', 'prettier', 'jest', 'mocha', 'chai',
  'moment', 'dayjs', 'chalk', 'commander', 'yargs', 'inquirer',
  'dotenv', 'cors', 'helmet', 'body-parser', 'uuid', 'debug',
];

export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function calcSimilarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

export function classifyRisk(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.85) return 'high';
  if (similarity >= 0.70) return 'medium';
  return 'low';
}

export function buildTyposquatResult(
  name: string,
  target: string,
  similarity: number
): TyposquatResult {
  return {
    name,
    suspectedTarget: target,
    similarity: Math.round(similarity * 100) / 100,
    risk: classifyRisk(similarity),
    reason: `"${name}" closely resembles popular package "${target}" (${Math.round(similarity * 100)}% similar)`,
  };
}

export function detectTyposquats(
  dependencies: ParsedDependency[],
  knownPackages: string[] = POPULAR_PACKAGES
): TyposquatResult[] {
  const results: TyposquatResult[] = [];
  for (const dep of dependencies) {
    if (knownPackages.includes(dep.name)) continue;
    let bestMatch = { target: '', similarity: 0 };
    for (const known of knownPackages) {
      const similarity = calcSimilarity(dep.name, known);
      if (similarity > bestMatch.similarity) {
        bestMatch = { target: known, similarity };
      }
    }
    if (bestMatch.similarity >= 0.70) {
      results.push(buildTyposquatResult(dep.name, bestMatch.target, bestMatch.similarity));
    }
  }
  return results;
}

export function summarizeTyposquats(results: TyposquatResult[]): TyposquatSummary {
  return {
    total: results.length,
    high: results.filter(r => r.risk === 'high').length,
    medium: results.filter(r => r.risk === 'medium').length,
    low: results.filter(r => r.risk === 'low').length,
  };
}
