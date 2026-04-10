import { DependencyInfo } from '../types';

export interface GraphNode {
  name: string;
  version: string;
  dependencies: string[];
  dependents: string[];
  depth: number;
}

export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  roots: string[];
}

export function buildDependencyGraph(dependencies: DependencyInfo[]): DependencyGraph {
  const nodes = new Map<string, GraphNode>();

  for (const dep of dependencies) {
    if (!nodes.has(dep.name)) {
      nodes.set(dep.name, {
        name: dep.name,
        version: dep.currentVersion,
        dependencies: [],
        dependents: [],
        depth: 0,
      });
    }
  }

  const roots = dependencies
    .filter((dep) => !dep.name.includes('/'))
    .map((dep) => dep.name);

  assignDepths(nodes, roots);

  return { nodes, roots };
}

function assignDepths(nodes: Map<string, GraphNode>, roots: string[]): void {
  const visited = new Set<string>();
  const queue: Array<{ name: string; depth: number }> = roots.map((r) => ({ name: r, depth: 0 }));

  while (queue.length > 0) {
    const { name, depth } = queue.shift()!;
    if (visited.has(name)) continue;
    visited.add(name);

    const node = nodes.get(name);
    if (node) {
      node.depth = depth;
      for (const dep of node.dependencies) {
        queue.push({ name: dep, depth: depth + 1 });
      }
    }
  }
}

export function getTransitiveDependents(graph: DependencyGraph, packageName: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [packageName];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const node = graph.nodes.get(current);
    if (node) {
      for (const dependent of node.dependents) {
        if (!visited.has(dependent)) {
          result.push(dependent);
          queue.push(dependent);
        }
      }
    }
  }

  return result;
}

export function getGraphStats(graph: DependencyGraph): { totalNodes: number; maxDepth: number; rootCount: number } {
  let maxDepth = 0;
  for (const node of graph.nodes.values()) {
    if (node.depth > maxDepth) maxDepth = node.depth;
  }
  return {
    totalNodes: graph.nodes.size,
    maxDepth,
    rootCount: graph.roots.length,
  };
}
