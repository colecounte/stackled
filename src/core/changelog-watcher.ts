import * as fs from 'fs';
import * as path from 'path';
import { getCacheFilePath, readCache, writeCache } from './cache-manager';
import { changelogFetcher } from './changelog-fetcher';
import { summarizeChangelog } from './changelog-summarizer';

export interface WatchEntry {
  name: string;
  version: string;
  addedAt: string;
}

export interface WatchResult {
  name: string;
  currentVersion: string;
  latestVersion: string;
  hasNewRelease: boolean;
  summary?: string;
}

const WATCH_FILE = 'watchlist.json';

export function loadWatchList(): WatchEntry[] {
  const cached = readCache<WatchEntry[]>(WATCH_FILE);
  return cached ?? [];
}

export function saveWatchList(entries: WatchEntry[]): void {
  writeCache(WATCH_FILE, entries);
}

export function addToWatchList(name: string, version: string): WatchEntry[] {
  const list = loadWatchList();
  const exists = list.some((e) => e.name === name);
  if (exists) {
    return list;
  }
  const entry: WatchEntry = { name, version, addedAt: new Date().toISOString() };
  const updated = [...list, entry];
  saveWatchList(updated);
  return updated;
}

export function removeFromWatchList(name: string): WatchEntry[] {
  const list = loadWatchList();
  const updated = list.filter((e) => e.name !== name);
  saveWatchList(updated);
  return updated;
}

export async function checkWatchList(
  fetchChangelog: typeof changelogFetcher
): Promise<WatchResult[]> {
  const list = loadWatchList();
  const results: WatchResult[] = [];

  for (const entry of list) {
    try {
      const changelog = await fetchChangelog(entry.name, entry.version);
      const summary = summarizeChangelog(changelog);
      const hasNewRelease = (summary.totalChanges ?? 0) > 0;
      results.push({
        name: entry.name,
        currentVersion: entry.version,
        latestVersion: changelog.latestVersion ?? entry.version,
        hasNewRelease,
        summary: summary.highlights.join('; ') || undefined,
      });
    } catch {
      results.push({
        name: entry.name,
        currentVersion: entry.version,
        latestVersion: entry.version,
        hasNewRelease: false,
      });
    }
  }

  return results;
}
