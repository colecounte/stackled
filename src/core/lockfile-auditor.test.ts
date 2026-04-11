import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectLockfileType,
  parseNpmLockfile,
  findMismatchedVersions,
  auditLockfile,
  LockfileEntry,
} from './lockfile-auditor';
import { Dependency } from '../types';

const makeDep = (name: string, currentVersion: string): Dependency =>
  ({ name, currentVersion, latestVersion: currentVersion, type: 'dependency' } as Dependency);

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stackled-lockfile-'));
}

describe('detectLockfileType', () => {
  it('detects npm lockfile', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}');
    expect(detectLockfileType(dir)).toBe('npm');
  });

  it('detects yarn lockfile', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'yarn.lock'), '');
    expect(detectLockfileType(dir)).toBe('yarn');
  });

  it('detects pnpm lockfile', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
    expect(detectLockfileType(dir)).toBe('pnpm');
  });

  it('returns unknown when no lockfile present', () => {
    const dir = makeTempDir();
    expect(detectLockfileType(dir)).toBe('unknown');
  });
});

describe('parseNpmLockfile', () => {
  it('parses packages from package-lock.json v3 format', () => {
    const dir = makeTempDir();
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        '': {},
        'node_modules/lodash': { version: '4.17.21', integrity: 'sha512-abc', resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz' },
        'node_modules/chalk': { version: '5.0.0', integrity: null, resolved: null },
      },
    };
    fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify(lockfile));
    const entries = parseNpmLockfile(path.join(dir, 'package-lock.json'));
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('lodash');
    expect(entries[0].resolvedVersion).toBe('4.17.21');
    expect(entries[0].integrityHash).toBe('sha512-abc');
    expect(entries[1].name).toBe('chalk');
    expect(entries[1].integrityHash).toBeNull();
  });
});

describe('findMismatchedVersions', () => {
  const entries: LockfileEntry[] = [
    { name: 'lodash', resolvedVersion: '4.17.20', integrityHash: 'sha512-x', resolved: null },
    { name: 'chalk', resolvedVersion: '5.0.0', integrityHash: 'sha512-y', resolved: null },
  ];

  it('flags exact version mismatches', () => {
    const deps = [makeDep('lodash', '4.17.21')];
    const result = findMismatchedVersions(entries, deps);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
  });

  it('ignores range specifiers like ^ and ~', () => {
    const deps = [makeDep('chalk', '^5.0.0')];
    const result = findMismatchedVersions(entries, deps);
    expect(result).toHaveLength(0);
  });

  it('returns empty when all match', () => {
    const deps = [makeDep('chalk', '5.0.0')];
    const result = findMismatchedVersions(entries, deps);
    expect(result).toHaveLength(0);
  });
});

describe('auditLockfile', () => {
  it('returns unknown result for non-npm lockfile', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'yarn.lock'), '');
    const result = auditLockfile(dir, []);
    expect(result.lockfileType).toBe('yarn');
    expect(result.totalEntries).toBe(0);
  });

  it('audits npm lockfile and finds missing integrity', () => {
    const dir = makeTempDir();
    const lockfile = {
      lockfileVersion: 3,
      packages: {
        'node_modules/lodash': { version: '4.17.21', resolved: 'https://r.npm' },
      },
    };
    fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify(lockfile));
    const result = auditLockfile(dir, []);
    expect(result.lockfileType).toBe('npm');
    expect(result.missingIntegrity).toContain('lodash');
  });
});
