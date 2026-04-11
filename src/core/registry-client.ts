import fetch from 'node-fetch';
import { PackageInfo } from '../types';

export interface RegistryClient {
  getPackageInfo(name: string): Promise<PackageInfo | null>;
}

export function parseRegistryResponse(data: Record<string, unknown>): PackageInfo {
  const distTags = (data['dist-tags'] as Record<string, string>) ?? {};
  const latestVersion = distTags['latest'] ?? '';
  const versions = (data['versions'] as Record<string, unknown>) ?? {};
  const latestData = (versions[latestVersion] as Record<string, unknown>) ?? {};
  const repository = extractRepositoryUrl(latestData['repository']);
  return {
    name: data['name'] as string,
    version: latestVersion,
    description: (data['description'] as string) ?? '',
    license: (latestData['license'] as string) ?? 'UNKNOWN',
    repository,
    deprecated: (latestData['deprecated'] as string) ?? undefined,
    engines: (latestData['engines'] as Record<string, string>) ?? {},
    maintainers: (data['maintainers'] as Array<{ name: string; email: string }>) ?? [],
    time: (data['time'] as Record<string, string>) ?? {},
    versions: Object.keys(versions),
    funding: latestData['funding'] as PackageInfo['funding'],
    homepage: (latestData['homepage'] as string) ?? undefined,
    changelog: undefined,
  };
}

export function extractRepositoryUrl(repo: unknown): string | undefined {
  if (!repo) return undefined;
  if (typeof repo === 'string') return repo;
  if (typeof repo === 'object' && repo !== null) {
    return (repo as Record<string, string>)['url'];
  }
  return undefined;
}

export function createRegistryClient(registryUrl = 'https://registry.npmjs.org'): RegistryClient {
  return {
    async getPackageInfo(name: string): Promise<PackageInfo | null> {
      try {
        const res = await fetch(`${registryUrl}/${encodeURIComponent(name)}`);
        if (!res.ok) return null;
        const data = (await res.json()) as Record<string, unknown>;
        return parseRegistryResponse(data);
      } catch {
        return null;
      }
    },
  };
}
