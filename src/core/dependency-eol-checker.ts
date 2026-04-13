import semver from 'semver';
import { ParsedDependency } from '../types';

export interface EolEntry {
  name: string;
  currentVersion: string;
  eolDate: string | null;
  isEol: boolean;
  daysUntilEol: number | null;
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  notes: string;
}

export interface EolSummary {
  total: number;
  eolCount: number;
  soonCount: number;
  entries: EolEntry[];
}

// Known EOL dates for major packages (illustrative)
const EOL_REGISTRY: Record<string, Record<string, string>> = {
  node: { '14': '2023-04-30', '16': '2023-09-11', '18': '2025-04-30', '20': '2026-04-28' },
  react: { '16': '2024-01-01', '17': '2025-01-01' },
  webpack: { '4': '2024-06-01' },
};

export function lookupEolDate(name: string, version: string): string | null {
  const registry = EOL_REGISTRY[name.toLowerCase()];
  if (!registry) return null;
  const major = semver.coerce(version)?.major?.toString();
  if (!major) return null;
  return registry[major] ?? null;
}

export function calcDaysUntilEol(eolDate: string): number {
  const now = Date.now();
  const eol = new Date(eolDate).getTime();
  return Math.floor((eol - now) / (1000 * 60 * 60 * 24));
}

export function classifyEolRisk(daysUntilEol: number | null, isEol: boolean): EolEntry['risk'] {
  if (isEol) return 'critical';
  if (daysUntilEol === null) return 'none';
  if (daysUntilEol <= 30) return 'high';
  if (daysUntilEol <= 90) return 'medium';
  if (daysUntilEol <= 180) return 'low';
  return 'none';
}

export function buildEolEntry(dep: ParsedDependency): EolEntry {
  const eolDate = lookupEolDate(dep.name, dep.currentVersion);
  const daysUntilEol = eolDate ? calcDaysUntilEol(eolDate) : null;
  const isEol = daysUntilEol !== null && daysUntilEol < 0;
  const risk = classifyEolRisk(daysUntilEol, isEol);
  const notes = isEol
    ? `Reached EOL on ${eolDate}`
    : daysUntilEol !== null
    ? `EOL in ${daysUntilEol} days (${eolDate})`
    : 'No EOL data available';
  return { name: dep.name, currentVersion: dep.currentVersion, eolDate, isEol, daysUntilEol, risk, notes };
}

export function checkDependencyEol(deps: ParsedDependency[]): EolSummary {
  const entries = deps.map(buildEolEntry);
  const eolCount = entries.filter((e) => e.isEol).length;
  const soonCount = entries.filter((e) => !e.isEol && e.daysUntilEol !== null && e.daysUntilEol <= 90).length;
  return { total: entries.length, eolCount, soonCount, entries };
}
