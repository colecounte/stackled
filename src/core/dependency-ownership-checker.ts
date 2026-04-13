import { Dependency } from '../types';

export interface OwnerEntry {
  name: string;
  ownerCount: number;
  owners: string[];
  hasOrgOwner: boolean;
  risk: 'low' | 'medium' | 'high';
  reason: string;
}

export interface OwnershipSummary {
  total: number;
  singleOwner: number;
  noOwner: number;
  orgOwned: number;
}

export function classifyOwnershipRisk(
  owners: string[]
): 'low' | 'medium' | 'high' {
  if (owners.length === 0) return 'high';
  if (owners.length === 1) return 'medium';
  return 'low';
}

export function hasOrgOwner(owners: string[]): boolean {
  return owners.some((o) => o.startsWith('@'));
}

export function buildOwnerEntry(
  dep: Dependency,
  owners: string[]
): OwnerEntry {
  const risk = classifyOwnershipRisk(owners);
  const orgOwner = hasOrgOwner(owners);
  const reason =
    owners.length === 0
      ? 'No owners found — package may be abandoned'
      : owners.length === 1
      ? 'Single maintainer — bus factor risk'
      : orgOwner
      ? 'Owned by an organisation'
      : 'Multiple individual owners';

  return {
    name: dep.name,
    ownerCount: owners.length,
    owners,
    hasOrgOwner: orgOwner,
    risk,
    reason,
  };
}

export function summarizeOwnership(entries: OwnerEntry[]): OwnershipSummary {
  return {
    total: entries.length,
    singleOwner: entries.filter((e) => e.ownerCount === 1).length,
    noOwner: entries.filter((e) => e.ownerCount === 0).length,
    orgOwned: entries.filter((e) => e.hasOrgOwner).length,
  };
}

export async function checkOwnership(
  deps: Dependency[],
  fetchOwners: (name: string) => Promise<string[]>
): Promise<OwnerEntry[]> {
  const results: OwnerEntry[] = [];
  for (const dep of deps) {
    try {
      const owners = await fetchOwners(dep.name);
      results.push(buildOwnerEntry(dep, owners));
    } catch {
      results.push(buildOwnerEntry(dep, []));
    }
  }
  return results;
}
