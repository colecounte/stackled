import { ParsedDependency } from '../types';

export interface CoOccurrenceEntry {
  name: string;
  pairedWith: string;
  coOccurrenceCount: number;
  commonVersionPattern: string | null;
  riskFlag: boolean;
}

export interface CoOccurrenceSummary {
  total: number;
  flagged: number;
  topPairs: Array<{ a: string; b: string; count: number }>;
}

const KNOWN_RISKY_COMBOS: Array<[string, string]> = [
  ['lodash', 'lodash-es'],
  ['moment', 'dayjs'],
  ['moment', 'date-fns'],
  ['axios', 'node-fetch'],
  ['request', 'axios'],
];

export function isRiskyCombo(a: string, b: string): boolean {
  return KNOWN_RISKY_COMBOS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a)
  );
}

export function extractCommonVersionPattern(
  versionA: string,
  versionB: string
): string | null {
  const majorA = versionA.replace(/[^\d.].*/, '').split('.')[0];
  const majorB = versionB.replace(/[^\d.].*/, '').split('.')[0];
  return majorA === majorB ? `^${majorA}.x` : null;
}

export function buildCoOccurrenceEntries(
  deps: ParsedDependency[]
): CoOccurrenceEntry[] {
  const entries: CoOccurrenceEntry[] = [];

  for (let i = 0; i < deps.length; i++) {
    for (let j = i + 1; j < deps.length; j++) {
      const a = deps[i];
      const b = deps[j];
      const risky = isRiskyCombo(a.name, b.name);
      const commonPattern = extractCommonVersionPattern(
        a.currentVersion,
        b.currentVersion
      );

      entries.push({
        name: a.name,
        pairedWith: b.name,
        coOccurrenceCount: 1,
        commonVersionPattern: commonPattern,
        riskFlag: risky,
      });
    }
  }

  return entries;
}

export function analyzeCoOccurrences(
  deps: ParsedDependency[]
): { entries: CoOccurrenceEntry[]; summary: CoOccurrenceSummary } {
  const entries = buildCoOccurrenceEntries(deps);
  const flagged = entries.filter((e) => e.riskFlag);

  const topPairs = entries
    .slice(0, 5)
    .map((e) => ({ a: e.name, b: e.pairedWith, count: e.coOccurrenceCount }));

  const summary: CoOccurrenceSummary = {
    total: entries.length,
    flagged: flagged.length,
    topPairs,
  };

  return { entries, summary };
}
