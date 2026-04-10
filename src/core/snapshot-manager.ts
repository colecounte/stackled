import * as fs from 'fs';
import * as path from 'path';
import { DependencyInfo } from '../types';
import { getCacheFilePath, ensureCacheDir } from './cache-manager';

export interface DependencySnapshot {
  timestamp: string;
  packageJsonPath: string;
  dependencies: Record<string, SnapshotEntry>;
}

export interface SnapshotEntry {
  name: string;
  resolvedVersion: string;
  latestVersion: string;
  isDirect: boolean;
}

export interface SnapshotDiff {
  added: SnapshotEntry[];
  removed: SnapshotEntry[];
  updated: Array<{ name: string; from: string; to: string }>;
  unchanged: string[];
}

const SNAPSHOT_FILE = 'snapshot.json';

export function getSnapshotPath(): string {
  return getCacheFilePath(SNAPSHOT_FILE);
}

export function saveSnapshot(snapshot: DependencySnapshot): void {
  ensureCacheDir();
  const snapshotPath = getSnapshotPath();
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

export function loadSnapshot(): DependencySnapshot | null {
  const snapshotPath = getSnapshotPath();
  if (!fs.existsSync(snapshotPath)) return null;
  try {
    const raw = fs.readFileSync(snapshotPath, 'utf-8');
    return JSON.parse(raw) as DependencySnapshot;
  } catch {
    return null;
  }
}

export function buildSnapshot(
  packageJsonPath: string,
  deps: DependencyInfo[]
): DependencySnapshot {
  const dependencies: Record<string, SnapshotEntry> = {};
  for (const dep of deps) {
    dependencies[dep.name] = {
      name: dep.name,
      resolvedVersion: dep.currentVersion,
      latestVersion: dep.latestVersion ?? dep.currentVersion,
      isDirect: dep.isDirect ?? true,
    };
  }
  return {
    timestamp: new Date().toISOString(),
    packageJsonPath,
    dependencies,
  };
}

export function diffSnapshots(
  previous: DependencySnapshot,
  current: DependencySnapshot
): SnapshotDiff {
  const prevKeys = new Set(Object.keys(previous.dependencies));
  const currKeys = new Set(Object.keys(current.dependencies));

  const added = [...currKeys]
    .filter((k) => !prevKeys.has(k))
    .map((k) => current.dependencies[k]);

  const removed = [...prevKeys]
    .filter((k) => !currKeys.has(k))
    .map((k) => previous.dependencies[k]);

  const updated: SnapshotDiff['updated'] = [];
  const unchanged: string[] = [];

  for (const key of currKeys) {
    if (!prevKeys.has(key)) continue;
    const prev = previous.dependencies[key];
    const curr = current.dependencies[key];
    if (prev.resolvedVersion !== curr.resolvedVersion) {
      updated.push({ name: key, from: prev.resolvedVersion, to: curr.resolvedVersion });
    } else {
      unchanged.push(key);
    }
  }

  return { added, removed, updated, unchanged };
}
