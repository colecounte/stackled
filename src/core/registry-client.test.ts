import { fetchPackageMetadata, fetchLatestVersion, parseRegistryResponse } from './registry-client';
import fetch from 'node-fetch';

jest.mock('node-fetch');
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

const mockRegistryResponse = {
  name: 'express',
  description: 'Fast web framework',
  'dist-tags': { latest: '4.18.2' },
  versions: { '4.17.0': {}, '4.18.0': {}, '4.18.2': { description: 'Fast web framework', repository: { url: 'git+https://github.com/expressjs/express.git' } } },
  time: { '4.18.2': '2023-01-01T00:00:00.000Z' },
  repository: { url: 'git+https://github.com/expressjs/express.git' },
};

describe('fetchPackageMetadata', () => {
  it('returns parsed metadata for a valid package', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: true, json: async () => mockRegistryResponse } as never);
    const result = await fetchPackageMetadata('express');
    expect(result.name).toBe('express');
    expect(result.latestVersion).toBe('4.18.2');
    expect(result.versions).toHaveLength(3);
    expect(result.npmUrl).toBe('https://www.npmjs.com/package/express');
  });

  it('throws a not-found error for 404 responses', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' } as never);
    await expect(fetchPackageMetadata('nonexistent-pkg-xyz')).rejects.toThrow("Package 'nonexistent-pkg-xyz' not found");
  });

  it('throws a generic error for other failed responses', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' } as never);
    await expect(fetchPackageMetadata('express')).rejects.toThrow('Registry request failed');
  });

  it('throws on network failure', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(fetchPackageMetadata('express')).rejects.toThrow('ECONNREFUSED');
  });
});

describe('fetchLatestVersion', () => {
  it('returns the latest version string', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ version: '4.18.2' }) } as never);
    const version = await fetchLatestVersion('express');
    expect(version).toBe('4.18.2');
  });

  it('throws on failed request', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' } as never);
    await expect(fetchLatestVersion('express')).rejects.toThrow('Failed to fetch latest version');
  });
});

describe('parseRegistryResponse', () => {
  it('extracts repository URL from git+ prefixed url', () => {
    const result = parseRegistryResponse('express', mockRegistryResponse as never);
    expect(result.repositoryUrl).toBe('https://github.com/expressjs/express');
  });

  it('handles missing repository gracefully', () => {
    const data = { ...mockRegistryResponse, repository: undefined };
    const result = parseRegistryResponse('express', data as never);
    expect(result.repositoryUrl).toBeUndefined();
  });

  it('strips .git suffix from repository URL', () => {
    const data = { ...mockRegistryResponse, repository: { url: 'https://github.com/expressjs/express.git' } };
    const result = parseRegistryResponse('express', data as never);
    expect(result.repositoryUrl).toBe('https://github.com/expressjs/express');
  });

  it('parses publishedAt as a Date', () => {
    const result = parseRegistryResponse('express', mockRegistryResponse as never);
    expect(result.publishedAt).toBeInstanceOf(Date);
  });
});
