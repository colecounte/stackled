import { fetchBundleSize, fetchBundleSizes } from './bundle-size-client';

const mockFetch = (data: unknown, ok = true): typeof fetch =>
  jest.fn().mockResolvedValue({
    ok,
    json: async () => data,
  }) as unknown as typeof fetch;

describe('fetchBundleSize', () => {
  it('returns a BundleSizeEntry on success', async () => {
    const fetcher = mockFetch({
      name: 'react',
      version: '18.0.0',
      gzip: 11_000,
      size: 42_000,
      hasSideEffects: false,
    });

    const result = await fetchBundleSize('react', '18.0.0', fetcher);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('react');
    expect(result?.gzip).toBe(11_000);
    expect(result?.treeshakeable).toBe(true);
  });

  it('returns null when response is not ok', async () => {
    const fetcher = mockFetch({}, false);
    const result = await fetchBundleSize('unknown-pkg', '1.0.0', fetcher);
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch;
    const result = await fetchBundleSize('react', '18.0.0', fetcher);
    expect(result).toBeNull();
  });

  it('defaults hasSideEffects to true when missing', async () => {
    const fetcher = mockFetch({ name: 'pkg', version: '1.0.0', gzip: 5000, size: 12000 });
    const result = await fetchBundleSize('pkg', '1.0.0', fetcher);
    expect(result?.hasSideEffects).toBe(true);
    expect(result?.treeshakeable).toBe(false);
  });
});

describe('fetchBundleSizes', () => {
  it('fetches multiple packages and filters nulls', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'react', version: '18.0.0', gzip: 11000, size: 42000, hasSideEffects: false }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    const results = await fetchBundleSizes(
      [{ name: 'react', version: '18.0.0' }, { name: 'bad-pkg', version: '0.0.1' }],
      fetcher
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('react');
  });

  it('returns empty array when all fetches fail', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    const results = await fetchBundleSizes([{ name: 'a', version: '1.0.0' }], fetcher);
    expect(results).toHaveLength(0);
  });
});
