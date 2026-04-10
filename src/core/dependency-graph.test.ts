import { describe, it, expect } from 'vitest';
import {
  buildDependencyGraph,
  getTransitiveDependents,
  getGraphStats,
  DependencyGraph,
} from './dependency-graph';
import { DependencyInfo } from '../types';

function makeDep(name: string, currentVersion = '1.0.0'): DependencyInfo {
  return {
    name,
    currentVersion,
    latestVersion: currentVersion,
    wantedVersion: currentVersion,
    type: 'dependencies',
  } as DependencyInfo;
}

describe('buildDependencyGraph', () => {
  it('creates a node for each dependency', () => {
    const deps = [makeDep('react'), makeDep('lodash'), makeDep('axios')];
    const graph = buildDependencyGraph(deps);
    expect(graph.nodes.size).toBe(3);
    expect(graph.nodes.has('react')).toBe(true);
    expect(graph.nodes.has('lodash')).toBe(true);
  });

  it('sets root nodes correctly', () => {
    const deps = [makeDep('react'), makeDep('lodash')];
    const graph = buildDependencyGraph(deps);
    expect(graph.roots).toContain('react');
    expect(graph.roots).toContain('lodash');
  });

  it('initializes nodes with depth 0 for roots', () => {
    const deps = [makeDep('express')];
    const graph = buildDependencyGraph(deps);
    expect(graph.nodes.get('express')?.depth).toBe(0);
  });

  it('handles empty dependency list', () => {
    const graph = buildDependencyGraph([]);
    expect(graph.nodes.size).toBe(0);
    expect(graph.roots).toHaveLength(0);
  });
});

describe('getTransitiveDependents', () => {
  function buildTestGraph(): DependencyGraph {
    const nodes = new Map();
    nodes.set('react', { name: 'react', version: '18.0.0', dependencies: [], dependents: ['my-app'], depth: 0 });
    nodes.set('my-app', { name: 'my-app', version: '1.0.0', dependencies: ['react'], dependents: [], depth: 1 });
    return { nodes, roots: ['react'] };
  }

  it('returns direct dependents', () => {
    const graph = buildTestGraph();
    const dependents = getTransitiveDependents(graph, 'react');
    expect(dependents).toContain('my-app');
  });

  it('returns empty array for package with no dependents', () => {
    const graph = buildTestGraph();
    const dependents = getTransitiveDependents(graph, 'my-app');
    expect(dependents).toHaveLength(0);
  });

  it('returns empty array for unknown package', () => {
    const graph = buildTestGraph();
    const dependents = getTransitiveDependents(graph, 'unknown-pkg');
    expect(dependents).toHaveLength(0);
  });
});

describe('getGraphStats', () => {
  it('returns correct total node count', () => {
    const deps = [makeDep('a'), makeDep('b'), makeDep('c')];
    const graph = buildDependencyGraph(deps);
    const stats = getGraphStats(graph);
    expect(stats.totalNodes).toBe(3);
  });

  it('returns maxDepth of 0 for flat graph', () => {
    const deps = [makeDep('a'), makeDep('b')];
    const graph = buildDependencyGraph(deps);
    const stats = getGraphStats(graph);
    expect(stats.maxDepth).toBe(0);
  });

  it('returns correct root count', () => {
    const deps = [makeDep('react'), makeDep('vue')];
    const graph = buildDependencyGraph(deps);
    const stats = getGraphStats(graph);
    expect(stats.rootCount).toBe(2);
  });
});
