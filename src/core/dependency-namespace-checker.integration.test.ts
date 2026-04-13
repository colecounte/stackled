import {
  checkDependencyNamespaces,
  summarizeNamespaces,
} from './dependency-namespace-checker';
import { PackageInfo } from '../types';

function makePkg(name: string, downloads = 5000): PackageInfo {
  return {
    name,
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    description: 'test package',
    repositoryUrl: 'https://github.com/test/repo',
    weeklyDownloads: downloads,
    dependencyCount: 2,
    devDependency: false,
  } as unknown as PackageInfo;
}

describe('dependency-namespace-checker integration', () => {
  const packages = [
    makePkg('@babel/core'),
    makePkg('@babel/parser'),
    makePkg('@babel/traverse'),
    makePkg('@types/node'),
    makePkg('@types/react'),
    makePkg('react'),
    makePkg('react-dom'),
    makePkg('react-router'),
    makePkg('lodash'),
    makePkg('utils'),
  ];

  it('correctly identifies scoped vs unscoped packages', () => {
    const entries = checkDependencyNamespaces(packages);
    const scoped = entries.filter((e) => e.isScoped);
    const unscoped = entries.filter((e) => !e.isScoped);
    expect(scoped).toHaveLength(5);
    expect(unscoped).toHaveLength(5);
  });

  it('groups babel packages under @babel namespace', () => {
    const entries = checkDependencyNamespaces(packages);
    const babelEntries = entries.filter((e) => e.namespace === '@babel');
    expect(babelEntries).toHaveLength(3);
    babelEntries.forEach((e) => expect(e.peerCount).toBe(2));
  });

  it('flags react-* packages with namespace collision risk', () => {
    const entries = checkDependencyNamespaces(packages);
    const reactDom = entries.find((e) => e.name === 'react-dom')!;
    expect(reactDom.peerCount).toBeGreaterThan(0);
  });

  it('summary reflects correct counts', () => {
    const entries = checkDependencyNamespaces(packages);
    const summary = summarizeNamespaces(entries);
    expect(summary.total).toBe(10);
    expect(summary.scoped).toBe(5);
    expect(summary.unscoped).toBe(5);
    expect(summary.namespaces['@babel']).toHaveLength(3);
    expect(summary.namespaces['@types']).toHaveLength(2);
  });

  it('utils package is flagged as generic-name', () => {
    const entries = checkDependencyNamespaces(packages);
    const utils = entries.find((e) => e.name === 'utils')!;
    expect(utils.flags).toContain('generic-name');
  });
});
