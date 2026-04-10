import { PackageInfo } from '../types';

export interface BundleSizeEntry {
  name: string;
  version: string;
  gzip: number;
  minified: number;
  hasSideEffects: boolean;
  treeshakeable: boolean;
}

export interface BundleSizeResult {
  entries: BundleSizeEntry[];
  totalGzip: number;
  totalMinified: number;
  largestPackage: BundleSizeEntry | null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function classifyBundleImpact(gzipBytes: number): 'low' | 'medium' | 'high' {
  if (gzipBytes < 10_000) return 'low';
  if (gzipBytes < 100_000) return 'medium';
  return 'high';
}

export function buildBundleSizeEntry(
  name: string,
  version: string,
  data: { gzip: number; minified: number; hasSideEffects: boolean }
): BundleSizeEntry {
  return {
    name,
    version,
    gzip: data.gzip,
    minified: data.minified,
    hasSideEffects: data.hasSideEffects,
    treeshakeable: !data.hasSideEffects,
  };
}

export function analyzeBundleSizes(entries: BundleSizeEntry[]): BundleSizeResult {
  const totalGzip = entries.reduce((sum, e) => sum + e.gzip, 0);
  const totalMinified = entries.reduce((sum, e) => sum + e.minified, 0);
  const largestPackage = entries.length
    ? entries.reduce((max, e) => (e.gzip > max.gzip ? e : max), entries[0])
    : null;

  return { entries, totalGzip, totalMinified, largestPackage };
}
