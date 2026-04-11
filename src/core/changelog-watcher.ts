import { RegistryClient } from './registry-client';
import { ChangelogSummary } from '../types';
import { summarizeChangelog } from './changelog-summarizer';
import { readCache, writeCache } from './cache-manager';

export interface WatchedPackage {
  name: string;
  currentVersion: string;
  watchedSince: string;
}

export interface WatchResult {
  name: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  summary: ChangelogSummary | null;
  checkedAt: string;
}

const WATCH_CACHE_KEY = 'changelog-watch-list';
const RESULT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function loadWatchList(): WatchedPackage[] {
  const cached = readCache<WatchedPackage[]>(WATCH_CACHE_KEY);
  return cached ?? [];
}

export function saveWatchList(packages: WatchedPackage[]): void {
  writeCache(WATCH_CACHE_KEY, packages, 0); // no TTL for watch list
}

export function addToWatchList(name: string, currentVersion: string): WatchedPackage[] {
  const list = loadWatchList();
  const existing = list.find((p) => p.name === name);
  if (existing) {
    existing.currentVersion = currentVersion;
    saveWatchList(list);
    return list;
  }
  const entry: WatchedPackage = { name, currentVersion, watchedSince: new Date().toISOString() };
  const updated = [...list, entry];
  saveWatchList(updated);
  return updated;
}

export function removeFromWatchList(name: string): WatchedPackage[] {
  const list = loadWatchList().filter((p) => p.name !== name);
  saveWatchList(list);
  return list;
}

export async function checkWatchedPackage(
  client: RegistryClient,
  watched: WatchedPackage
): Promise<WatchResult> {
  const cacheKey = `watch-result-${watched.name}`;
  const cached = readCache<WatchResult>(cacheKey);
  if (cached) return cached;

  const info = await client.getPackageInfo(watched.name);
  const latestVersion = info?.version ?? watched.currentVersion;
  const hasUpdate = latestVersion !== watched.currentVersion;
  const changelog = hasUpdate && info?.changelog ? info.changelog : null;
  const summary = changelog ? summarizeChangelog(changelog) : null;

  const result: WatchResult = {
    name: watched.name,
    currentVersion: watched.currentVersion,
    latestVersion,
    hasUpdate,
    summary,
    checkedAt: new Date().toISOString(),
  };

  writeCache(cacheKey, result, RESULT_CACHE_TTL);
  return result;
}

export async function runWatchCheck(
  client: RegistryClient
): Promise<WatchResult[]> {
  const list = loadWatchList();
  return Promise.all(list.map((pkg) => checkWatchedPackage(client, pkg)));
}
