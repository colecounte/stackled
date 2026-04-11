import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../types';

export interface LockfileEntry {
  name: string;
  resolvedVersion: string;
  integrityHash: string | null;
  resolved: string | null;
}

export interface LockfileAuditResult {
  lockfileType: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  entries: LockfileEntry[];
  missingIntegrity: string[];
  mismatchedVersions: Array<{ name: string; declared: string; resolved: string }>;
  totalEntries: number;
}

export function detectLockfileType(dir: string): 'npm' | 'yarn' | 'pnpm' | 'unknown' {
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  return 'unknown';
}

export function parseNpmLockfile(lockfilePath: string): LockfileEntry[] {
  const raw = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));
  const packages: Record<string, { version: string; integrity?: string; resolved?: string }> =
    raw.packages ?? raw.dependencies ?? {};

  return Object.entries(packages)
    .filter(([key]) => key !== '')
    .map(([key, val]) => ({
      name: key.replace(/^node_modules\//, ''),
      resolvedVersion: val.version ?? 'unknown',
      integrityHash: val.integrity ?? null,
      resolved: val.resolved ?? null,
    }));
}

export function findMismatchedVersions(
  entries: LockfileEntry[],
  dependencies: Dependency[]
): Array<{ name: string; declared: string; resolved: string }> {
  const mismatches: Array<{ name: string; declared: string; resolved: string }> = [];
  for (const dep of dependencies) {
    const entry = entries.find((e) => e.name === dep.name);
    if (!entry) continue;
    const declared = dep.currentVersion.replace(/^[^\d]*/, '');
    const resolved = entry.resolvedVersion.replace(/^[^\d]*/, '');
    if (declared !== resolved && !dep.currentVersion.startsWith('^') && !dep.currentVersion.startsWith('~')) {
      mismatches.push({ name: dep.name, declared: dep.currentVersion, resolved: entry.resolvedVersion });
    }
  }
  return mismatches;
}

export function auditLockfile(dir: string, dependencies: Dependency[]): LockfileAuditResult {
  const lockfileType = detectLockfileType(dir);

  if (lockfileType !== 'npm') {
    return {
      lockfileType,
      entries: [],
      missingIntegrity: [],
      mismatchedVersions: [],
      totalEntries: 0,
    };
  }

  const lockfilePath = path.join(dir, 'package-lock.json');
  const entries = parseNpmLockfile(lockfilePath);
  const missingIntegrity = entries.filter((e) => !e.integrityHash).map((e) => e.name);
  const mismatchedVersions = findMismatchedVersions(entries, dependencies);

  return {
    lockfileType,
    entries,
    missingIntegrity,
    mismatchedVersions,
    totalEntries: entries.length,
  };
}
