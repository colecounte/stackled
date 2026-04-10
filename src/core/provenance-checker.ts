import { Dependency } from '../types';

export interface ProvenanceEntry {
  name: string;
  version: string;
  hasProvenance: boolean;
  attestationType: string | null;
  registryUrl: string | null;
  signingAuthority: string | null;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ProvenanceSummary {
  total: number;
  verified: number;
  unverified: number;
  highRisk: number;
}

export function classifyProvenanceRisk(
  hasProvenance: boolean,
  attestationType: string | null
): 'low' | 'medium' | 'high' {
  if (hasProvenance && attestationType === 'npm-provenance') return 'low';
  if (hasProvenance) return 'medium';
  return 'high';
}

export function buildProvenanceEntry(
  dep: Dependency,
  raw: Record<string, unknown>
): ProvenanceEntry {
  const dist = raw.dist as Record<string, unknown> | undefined;
  const attestations = dist?.attestations as Record<string, unknown> | undefined;
  const hasProvenance = Boolean(attestations?.url);
  const attestationType = hasProvenance
    ? ((attestations as Record<string, unknown>)?.type as string) ?? 'unknown'
    : null;

  return {
    name: dep.name,
    version: dep.version,
    hasProvenance,
    attestationType,
    registryUrl: hasProvenance ? (attestations?.url as string) ?? null : null,
    signingAuthority: hasProvenance ? 'npmjs.com' : null,
    riskLevel: classifyProvenanceRisk(hasProvenance, attestationType),
  };
}

export function checkProvenances(
  deps: Dependency[],
  registryData: Record<string, Record<string, unknown>>
): ProvenanceEntry[] {
  return deps.map((dep) => {
    const raw = registryData[dep.name] ?? {};
    return buildProvenanceEntry(dep, raw);
  });
}

export function summarizeProvenance(entries: ProvenanceEntry[]): ProvenanceSummary {
  return {
    total: entries.length,
    verified: entries.filter((e) => e.hasProvenance).length,
    unverified: entries.filter((e) => !e.hasProvenance).length,
    highRisk: entries.filter((e) => e.riskLevel === 'high').length,
  };
}
