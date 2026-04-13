import { PackageInfo } from '../types';

export interface NamespaceEntry {
  name: string;
  scope: string | null;
  isScoped: boolean;
  namespace: string;
  peerCount: number;
  risk: 'low' | 'medium' | 'high';
  flags: string[];
}

export interface NamespaceSummary {
  total: number;
  scoped: number;
  unscoped: number;
  highRisk: number;
  namespaces: Record<string, string[]>;
}

export function extractScope(name: string): string | null {
  return name.startsWith('@') ? name.split('/')[0] : null;
}

export function extractNamespace(name: string): string {
  const scope = extractScope(name);
  if (scope) return scope;
  return name.split('-')[0] ?? name;
}

export function classifyNamespaceRisk(
  entry: Pick<NamespaceEntry, 'isScoped' | 'peerCount' | 'flags'>
): 'low' | 'medium' | 'high' {
  if (entry.flags.length >= 2) return 'high';
  if (!entry.isScoped && entry.peerCount > 5) return 'medium';
  if (entry.flags.length === 1) return 'medium';
  return 'low';
}

export function buildNamespaceEntry(
  pkg: PackageInfo,
  allPackages: PackageInfo[]
): NamespaceEntry {
  const scope = extractScope(pkg.name);
  const namespace = extractNamespace(pkg.name);
  const isScoped = scope !== null;
  const peerCount = allPackages.filter(
    (p) => p.name !== pkg.name && extractNamespace(p.name) === namespace
  ).length;

  const flags: string[] = [];
  if (!isScoped && peerCount > 3) flags.push('namespace-collision-risk');
  if (!isScoped && pkg.name.split('-').length === 1) flags.push('generic-name');
  if (isScoped && scope === '@types') flags.push('types-only');

  const risk = classifyNamespaceRisk({ isScoped, peerCount, flags });

  return { name: pkg.name, scope, isScoped, namespace, peerCount, risk, flags };
}

export function checkDependencyNamespaces(
  packages: PackageInfo[]
): NamespaceEntry[] {
  return packages.map((pkg) => buildNamespaceEntry(pkg, packages));
}

export function summarizeNamespaces(
  entries: NamespaceEntry[]
): NamespaceSummary {
  const namespaces: Record<string, string[]> = {};
  for (const e of entries) {
    if (!namespaces[e.namespace]) namespaces[e.namespace] = [];
    namespaces[e.namespace].push(e.name);
  }
  return {
    total: entries.length,
    scoped: entries.filter((e) => e.isScoped).length,
    unscoped: entries.filter((e) => !e.isScoped).length,
    highRisk: entries.filter((e) => e.risk === 'high').length,
    namespaces,
  };
}
