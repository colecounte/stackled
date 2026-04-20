import { PackageInfo } from '../types';

export type SignatureStatus = 'verified' | 'unverified' | 'missing' | 'invalid';

export interface SignatureEntry {
  name: string;
  version: string;
  status: SignatureStatus;
  hasProvenance: boolean;
  hasSigstore: boolean;
  hasNpmSignature: boolean;
  flags: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SignatureSummary {
  total: number;
  verified: number;
  unverified: number;
  missing: number;
  invalid: number;
  highRisk: number;
}

export function classifySignatureRisk(
  status: SignatureStatus,
  hasProvenance: boolean
): 'low' | 'medium' | 'high' {
  if (status === 'invalid') return 'high';
  if (status === 'missing' && !hasProvenance) return 'high';
  if (status === 'unverified') return 'medium';
  if (status === 'missing') return 'medium';
  return 'low';
}

export function buildSignatureFlags(
  status: SignatureStatus,
  hasProvenance: boolean,
  hasSigstore: boolean
): string[] {
  const flags: string[] = [];
  if (status === 'invalid') flags.push('invalid-signature');
  if (status === 'missing') flags.push('no-signature');
  if (!hasProvenance) flags.push('no-provenance');
  if (!hasSigstore) flags.push('no-sigstore');
  return flags;
}

export function buildSignatureEntry(
  pkg: PackageInfo,
  meta: Record<string, unknown>
): SignatureEntry {
  const dist = (meta.dist ?? {}) as Record<string, unknown>;
  const signatures = Array.isArray(dist.signatures) ? dist.signatures : [];
  const hasSigstore = signatures.some(
    (s: unknown) =>
      typeof s === 'object' &&
      s !== null &&
      (s as Record<string, unknown>).keyid?.toString().includes('sigstore')
  );
  const hasNpmSignature = typeof dist.integrity === 'string' && dist.integrity.length > 0;
  const hasProvenance = typeof meta.provenance === 'object' && meta.provenance !== null;

  let status: SignatureStatus = 'missing';
  if (signatures.length > 0 && hasNpmSignature) status = 'verified';
  else if (hasNpmSignature) status = 'unverified';

  const riskLevel = classifySignatureRisk(status, hasProvenance);
  const flags = buildSignatureFlags(status, hasProvenance, hasSigstore);

  return {
    name: pkg.name,
    version: pkg.version,
    status,
    hasProvenance,
    hasSigstore,
    hasNpmSignature,
    flags,
    riskLevel,
  };
}

export function verifySignatures(pkgs: PackageInfo[], metas: Record<string, Record<string, unknown>>): SignatureEntry[] {
  return pkgs.map((pkg) => buildSignatureEntry(pkg, metas[pkg.name] ?? {}));
}

export function summarizeSignatures(entries: SignatureEntry[]): SignatureSummary {
  return {
    total: entries.length,
    verified: entries.filter((e) => e.status === 'verified').length,
    unverified: entries.filter((e) => e.status === 'unverified').length,
    missing: entries.filter((e) => e.status === 'missing').length,
    invalid: entries.filter((e) => e.status === 'invalid').length,
    highRisk: entries.filter((e) => e.riskLevel === 'high').length,
  };
}
