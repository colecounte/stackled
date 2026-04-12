import { PackageInfo } from '../types';

export interface InstallSizeEntry {
  name: string;
  version: string;
  publishSize: number;
  installSize: number;
  fileCount: number;
  formattedPublish: string;
  formattedInstall: string;
  flag: 'ok' | 'warn' | 'danger';
}

export interface InstallSizeSummary {
  totalPublish: number;
  totalInstall: number;
  largestPackage: string;
  flaggedCount: number;
}

const WARN_THRESHOLD_BYTES = 500_000;   // 500 KB
const DANGER_THRESHOLD_BYTES = 5_000_000; // 5 MB

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
  return `${bytes} B`;
}

export function classifyInstallFlag(
  installSize: number
): InstallSizeEntry['flag'] {
  if (installSize >= DANGER_THRESHOLD_BYTES) return 'danger';
  if (installSize >= WARN_THRESHOLD_BYTES) return 'warn';
  return 'ok';
}

export function buildInstallSizeEntry(
  pkg: PackageInfo,
  publishSize: number,
  installSize: number,
  fileCount: number
): InstallSizeEntry {
  return {
    name: pkg.name,
    version: pkg.version,
    publishSize,
    installSize,
    fileCount,
    formattedPublish: formatBytes(publishSize),
    formattedInstall: formatBytes(installSize),
    flag: classifyInstallFlag(installSize),
  };
}

export function summarizeInstallSizes(
  entries: InstallSizeEntry[]
): InstallSizeSummary {
  const totalPublish = entries.reduce((s, e) => s + e.publishSize, 0);
  const totalInstall = entries.reduce((s, e) => s + e.installSize, 0);
  const largest = entries.reduce(
    (max, e) => (e.installSize > max.installSize ? e : max),
    entries[0]
  );
  return {
    totalPublish,
    totalInstall,
    largestPackage: largest?.name ?? '',
    flaggedCount: entries.filter((e) => e.flag !== 'ok').length,
  };
}
