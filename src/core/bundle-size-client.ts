import { buildBundleSizeEntry, BundleSizeEntry } from './bundle-size-analyzer';

const BUNDLEPHOBIA_API = 'https://bundlephobia.com/api/size';

export interface BundlephobiaResponse {
  name: string;
  version: string;
  gzip: number;
  size: number;
  hasSideEffects: boolean;
}

export async function fetchBundleSize(
  name: string,
  version: string,
  fetcher: typeof fetch = fetch
): Promise<BundleSizeEntry | null> {
  try {
    const url = `${BUNDLEPHOBIA_API}?package=${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
    const response = await fetcher(url);
    if (!response.ok) return null;

    const data: BundlephobiaResponse = await response.json();
    return buildBundleSizeEntry(data.name, data.version, {
      gzip: data.gzip,
      minified: data.size,
      hasSideEffects: data.hasSideEffects ?? true,
    });
  } catch {
    return null;
  }
}

export async function fetchBundleSizes(
  packages: Array<{ name: string; version: string }>,
  fetcher: typeof fetch = fetch
): Promise<BundleSizeEntry[]> {
  const results = await Promise.all(
    packages.map(({ name, version }) => fetchBundleSize(name, version, fetcher))
  );
  return results.filter((r): r is BundleSizeEntry => r !== null);
}
