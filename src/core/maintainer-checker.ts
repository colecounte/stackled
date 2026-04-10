import { PackageInfo } from '../types';

export interface MaintainerInfo {
  name: string;
  email?: string;
  url?: string;
}

export interface MaintainerStatus {
  packageName: string;
  maintainers: MaintainerInfo[];
  lastPublish: string | null;
  daysSincePublish: number | null;
  isAbandoned: boolean;
  abandonedThresholdDays: number;
}

export const ABANDONED_THRESHOLD_DAYS = 365;

export function parseMaintainers(raw: unknown[]): MaintainerInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, string> => typeof m === 'object' && m !== null)
    .map((m) => ({
      name: m['name'] ?? 'unknown',
      email: m['email'],
      url: m['url'],
    }));
}

export function calcDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const published = new Date(dateStr);
  if (isNaN(published.getTime())) return null;
  const diffMs = Date.now() - published.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function buildMaintainerStatus(
  packageName: string,
  maintainers: MaintainerInfo[],
  lastPublish: string | null,
  thresholdDays: number = ABANDONED_THRESHOLD_DAYS
): MaintainerStatus {
  const daysSincePublish = calcDaysSince(lastPublish);
  const isAbandoned =
    daysSincePublish !== null && daysSincePublish > thresholdDays;
  return {
    packageName,
    maintainers,
    lastPublish,
    daysSincePublish,
    isAbandoned,
    abandonedThresholdDays: thresholdDays,
  };
}

export function checkMaintainers(
  packages: PackageInfo[],
  registryData: Record<string, { maintainers?: unknown[]; time?: Record<string, string> }>,
  thresholdDays: number = ABANDONED_THRESHOLD_DAYS
): MaintainerStatus[] {
  return packages.map((pkg) => {
    const data = registryData[pkg.name] ?? {};
    const maintainers = parseMaintainers(data.maintainers ?? []);
    const time = data.time ?? {};
    const modified = time['modified'] ?? null;
    return buildMaintainerStatus(pkg.name, maintainers, modified, thresholdDays);
  });
}
