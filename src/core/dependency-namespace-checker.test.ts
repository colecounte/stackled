import {
  extractScope,
  extractNamespace,
  classifyNamespaceRisk,
  buildNamespaceEntry,
  checkDependencyNamespaces,
  summarizeNamespaces,
} from './dependency-namespace-checker';
import { PackageInfo } from '../types';

function makePkg(name: string): PackageInfo {
  return {
    name,
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    description: '',
    repositoryUrl: '',
    weeklyDownloads: 1000,
    dependencyCount: 0,
    devDependency: false,
  } as unknown as PackageInfo;
}

describe('extractScope', () => {
  it('returns scope for scoped packages', () => {
    expect(extractScope('@babel/core')).toBe('@babel');
  });
  it('returns null for unscoped packages', () => {
    expect(extractScope('lodash')).toBeNull();
  });
});

describe('extractNamespace', () => {
  it('returns scope for scoped packages', () => {
    expect(extractNamespace('@babel/core')).toBe('@babel');
  });
  it('returns first segment for hyphenated names', () => {
    expect(extractNamespace('react-dom')).toBe('react');
  });
  it('returns full name for single-word packages', () => {
    expect(extractNamespace('lodash')).toBe('lodash');
  });
});

describe('classifyNamespaceRisk', () => {
  it('returns high when 2+ flags', () => {
    expect(classifyNamespaceRisk({ isScoped: false, peerCount: 0, flags: ['a', 'b'] })).toBe('high');
  });
  it('returns medium when unscoped with many peers', () => {
    expect(classifyNamespaceRisk({ isScoped: false, peerCount: 6, flags: [] })).toBe('medium');
  });
  it('returns medium when 1 flag', () => {
    expect(classifyNamespaceRisk({ isScoped: false, peerCount: 0, flags: ['x'] })).toBe('medium');
  });
  it('returns low otherwise', () => {
    expect(classifyNamespaceRisk({ isScoped: true, peerCount: 0, flags: [] })).toBe('low');
  });
});

describe('buildNamespaceEntry', () => {
  it('builds entry for scoped package', () => {
    const pkg = makePkg('@babel/core');
    const entry = buildNamespaceEntry(pkg, [pkg, makePkg('@babel/parser')]);
    expect(entry.isScoped).toBe(true);
    expect(entry.scope).toBe('@babel');
    expect(entry.peerCount).toBe(1);
  });

  it('flags generic single-word unscoped name', () => {
    const pkg = makePkg('utils');
    const entry = buildNamespaceEntry(pkg, [pkg]);
    expect(entry.flags).toContain('generic-name');
  });

  it('flags @types packages', () => {
    const pkg = makePkg('@types/node');
    const entry = buildNamespaceEntry(pkg, [pkg]);
    expect(entry.flags).toContain('types-only');
  });
});

describe('checkDependencyNamespaces', () => {
  it('returns one entry per package', () => {
    const pkgs = [makePkg('react'), makePkg('react-dom'), makePkg('lodash')];
    const results = checkDependencyNamespaces(pkgs);
    expect(results).toHaveLength(3);
  });
});

describe('summarizeNamespaces', () => {
  it('groups packages by namespace', () => {
    const pkgs = [makePkg('@babel/core'), makePkg('@babel/parser'), makePkg('lodash')];
    const entries = checkDependencyNamespaces(pkgs);
    const summary = summarizeNamespaces(entries);
    expect(summary.scoped).toBe(2);
    expect(summary.unscoped).toBe(1);
    expect(summary.namespaces['@babel']).toHaveLength(2);
  });
});
