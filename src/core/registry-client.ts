import fetch from 'node-fetch';
import { PackageMetadata } from '../types';

const NPM_REGISTRY_BASE = 'https://registry.npmjs.org';

export async function fetchPackageMetadata(packageName: string): Promise<PackageMetadata> {
  const url = `${NPM_REGISTRY_BASE}/${encodeURIComponent(packageName)}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Package '${packageName}' not found in npm registry`);
    }
    throw new Error(`Registry request failed for '${packageName}': ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return parseRegistryResponse(packageName, data);
}

export async function fetchLatestVersion(packageName: string): Promise<string> {
  const url = `${NPM_REGISTRY_BASE}/${encodeURIComponent(packageName)}/latest`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch latest version for '${packageName}': ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return data.version as string;
}

export function parseRegistryResponse(packageName: string, data: Record<string, unknown>): PackageMetadata {
  const distTags = (data['dist-tags'] as Record<string, string>) ?? {};
  const versions = Object.keys((data.versions as Record<string, unknown>) ?? {});
  const time = (data.time as Record<string, string>) ?? {};
  const latestVersion = distTags.latest ?? versions[versions.length - 1] ?? 'unknown';
  const versionData = (data.versions as Record<string, Record<string, unknown>>)?.[latestVersion] ?? {};

  return {
    name: packageName,
    latestVersion,
    versions,
    publishedAt: time[latestVersion] ? new Date(time[latestVersion]) : undefined,
    description: (data.description as string) ?? (versionData.description as string) ?? '',
    repositoryUrl: extractRepositoryUrl(versionData.repository ?? data.repository),
    npmUrl: `https://www.npmjs.com/package/${packageName}`,
  };
}

function extractRepositoryUrl(repo: unknown): string | undefined {
  if (!repo) return undefined;
  if (typeof repo === 'string') return repo;
  if (typeof repo === 'object' && repo !== null) {
    const r = repo as Record<string, string>;
    return r.url?.replace(/^git\+/, '').replace(/\.git$/, '');
  }
  return undefined;
}
