import { Dependency } from '../types';

export interface FundingEntry {
  name: string;
  version: string;
  funding: FundingSource[];
  hasFunding: boolean;
}

export interface FundingSource {
  type: string;
  url: string;
}

export interface FundingSummary {
  total: number;
  funded: number;
  unfunded: number;
  fundedPercent: number;
}

export function parseFundingSources(raw: unknown): FundingSource[] {
  if (!raw) return [];
  if (typeof raw === 'string') return [{ type: 'url', url: raw }];
  if (Array.isArray(raw)) {
    return raw
      .filter((f) => f && typeof f === 'object' && f.url)
      .map((f) => ({ type: f.type ?? 'other', url: f.url }));
  }
  if (typeof raw === 'object' && (raw as any).url) {
    return [{ type: (raw as any).type ?? 'other', url: (raw as any).url }];
  }
  return [];
}

export function buildFundingEntry(
  dep: Dependency,
  registryData: Record<string, unknown>
): FundingEntry {
  const funding = parseFundingSources(registryData.funding);
  return {
    name: dep.name,
    version: dep.installedVersion ?? dep.specifiedVersion,
    funding,
    hasFunding: funding.length > 0,
  };
}

export function checkFunding(
  deps: Dependency[],
  registryMap: Record<string, Record<string, unknown>>
): FundingEntry[] {
  return deps.map((dep) => {
    const data = registryMap[dep.name] ?? {};
    return buildFundingEntry(dep, data);
  });
}

export function summarizeFunding(entries: FundingEntry[]): FundingSummary {
  const total = entries.length;
  const funded = entries.filter((e) => e.hasFunding).length;
  const unfunded = total - funded;
  const fundedPercent = total > 0 ? Math.round((funded / total) * 100) : 0;
  return { total, funded, unfunded, fundedPercent };
}
