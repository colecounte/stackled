import * as fs from 'fs';
import { buildSnapshot, diffSnapshots, saveSnapshot, loadSnapshot, getSnapshotPath } from './snapshot-manager';
import { DependencyInfo } from '../types';

jest.mock('fs');
jest.mock('./cache-manager', () => ({
  getCacheFilePath: (f: string) => `/tmp/.stackled/${f}`,
  ensureCacheDir: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

const deps: DependencyInfo[] = [
  { name: 'react', currentVersion: '18.0.0', latestVersion: '18.2.0', isDirect: true },
  { name: 'lodash', currentVersion: '4.17.21', latestVersion: '4.17.21', isDirect: false },
];

describe('buildSnapshot', () => {
  it('creates a snapshot with correct entries', () => {
    const snap = buildSnapshot('package.json', deps);
    expect(snap.packageJsonPath).toBe('package.json');
    expect(snap.dependencies['react'].resolvedVersion).toBe('18.0.0');
    expect(snap.dependencies['lodash'].isDirect).toBe(false);
    expect(snap.timestamp).toBeTruthy();
  });
});

describe('diffSnapshots', () => {
  it('detects added dependencies', () => {
    const prev = buildSnapshot('pkg.json', [deps[0]]);
    const curr = buildSnapshot('pkg.json', deps);
    const diff = diffSnapshots(prev, curr);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].name).toBe('lodash');
  });

  it('detects removed dependencies', () => {
    const prev = buildSnapshot('pkg.json', deps);
    const curr = buildSnapshot('pkg.json', [deps[1]]);
    const diff = diffSnapshots(prev, curr);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].name).toBe('react');
  });

  it('detects updated versions', () => {
    const prev = buildSnapshot('pkg.json', deps);
    const updatedDeps = [{ ...deps[0], currentVersion: '18.2.0' }, deps[1]];
    const curr = buildSnapshot('pkg.json', updatedDeps);
    const diff = diffSnapshots(prev, curr);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]).toEqual({ name: 'react', from: '18.0.0', to: '18.2.0' });
  });

  it('marks unchanged dependencies', () => {
    const snap = buildSnapshot('pkg.json', deps);
    const diff = diffSnapshots(snap, snap);
    expect(diff.unchanged).toHaveLength(2);
    expect(diff.updated).toHaveLength(0);
  });
});

describe('saveSnapshot / loadSnapshot', () => {
  it('saves and loads a snapshot', () => {
    const snap = buildSnapshot('package.json', deps);
    mockFs.writeFileSync = jest.fn();
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(snap));

    saveSnapshot(snap);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/.stackled/snapshot.json',
      expect.any(String),
      'utf-8'
    );

    const loaded = loadSnapshot();
    expect(loaded?.packageJsonPath).toBe('package.json');
  });

  it('returns null when snapshot file does not exist', () => {
    mockFs.existsSync = jest.fn().mockReturnValue(false);
    const result = loadSnapshot();
    expect(result).toBeNull();
  });

  it('returns null on parse error', () => {
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.readFileSync = jest.fn().mockReturnValue('not-json');
    const result = loadSnapshot();
    expect(result).toBeNull();
  });
});
