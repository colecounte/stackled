import { Dependency } from '../types';

export interface SupplyChainEntry {
  name: string;
  version: string;
  publishedAt: string | null;
  hasInstallScript: boolean;
  scriptTypes: string[];
  downloadsLastWeek: number | null;
  risk: 'low' | 'medium' | 'high';
  reasons: string[];
}

export interface SupplyChainSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export function classifySupplyChainRisk(
  hasInstallScript: boolean,
  downloadsLastWeek: number | null,
  publishedAt: string | null
): 'low' | 'medium' | 'high' {
  const reasons: string[] = [];
  if (hasInstallScript) reasons.push('install-script');
  if (downloadsLastWeek !== null && downloadsLastWeek < 100) reasons.push('low-downloads');
  if (!publishedAt) reasons.push('no-publish-date');

  if (reasons.length >= 2) return 'high';
  if (reasons.length === 1) return 'medium';
  return 'low';
}

export function buildSupplyChainEntry(
  dep: Dependency,
  meta: {
    publishedAt: string | null;
    scripts: Record<string, string>;
    downloadsLastWeek: number | null;
  }
): SupplyChainEntry {
  const installScriptKeys = ['preinstall', 'install', 'postinstall', 'prepare'];
  const scriptTypes = Object.keys(meta.scripts || {}).filter((k) =>
    installScriptKeys.includes(k)
  );
  const hasInstallScript = scriptTypes.length > 0;

  const reasons: string[] = [];
  if (hasInstallScript) reasons.push(`Has install scripts: ${scriptTypes.join(', ')}`);
  if (meta.downloadsLastWeek !== null && meta.downloadsLastWeek < 100)
    reasons.push(`Low weekly downloads: ${meta.downloadsLastWeek}`);
  if (!meta.publishedAt) reasons.push('No publish date available');

  return {
    name: dep.name,
    version: dep.version,
    publishedAt: meta.publishedAt,
    hasInstallScript,
    scriptTypes,
    downloadsLastWeek: meta.downloadsLastWeek,
    risk: classifySupplyChainRisk(hasInstallScript, meta.downloadsLastWeek, meta.publishedAt),
    reasons,
  };
}

export function summarizeSupplyChain(entries: SupplyChainEntry[]): SupplyChainSummary {
  return entries.reduce(
    (acc, e) => {
      acc.total++;
      acc[e.risk]++;
      return acc;
    },
    { total: 0, high: 0, medium: 0, low: 0 }
  );
}
