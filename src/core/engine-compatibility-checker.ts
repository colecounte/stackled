import semver from 'semver';
import { ParsedDependency } from '../types/index.js';

export interface EngineIssue {
  name: string;
  requiredNode: string;
  currentNode: string;
  compatible: boolean;
  severity: 'low' | 'medium' | 'high';
}

export interface EngineCompatibilityResult {
  currentNode: string;
  issues: EngineIssue[];
  incompatibleCount: number;
  summary: string;
}

export function getCurrentNodeVersion(): string {
  return process.version;
}

export function checkEngineCompatibility(
  dep: ParsedDependency,
  engines: Record<string, string> | undefined,
  currentNode: string
): EngineIssue | null {
  if (!engines?.node) return null;

  const required = engines.node;
  const compatible = semver.satisfies(currentNode, required);

  const severity: EngineIssue['severity'] = compatible
    ? 'low'
    : semver.gtr(currentNode, required.replace(/[^0-9.x*]/g, '').split(' ')[0] ?? '0.0.0')
    ? 'medium'
    : 'high';

  return {
    name: dep.name,
    requiredNode: required,
    currentNode,
    compatible,
    severity: compatible ? 'low' : severity,
  };
}

export function analyzeEngineCompatibility(
  deps: ParsedDependency[],
  enginesMap: Record<string, Record<string, string> | undefined>,
  currentNode?: string
): EngineCompatibilityResult {
  const nodeVersion = currentNode ?? getCurrentNodeVersion();
  const issues: EngineIssue[] = [];

  for (const dep of deps) {
    const issue = checkEngineCompatibility(dep, enginesMap[dep.name], nodeVersion);
    if (issue && !issue.compatible) {
      issues.push(issue);
    }
  }

  const incompatibleCount = issues.length;
  const summary =
    incompatibleCount === 0
      ? `All dependencies are compatible with Node ${nodeVersion}`
      : `${incompatibleCount} dependenc${incompatibleCount === 1 ? 'y' : 'ies'} incompatible with Node ${nodeVersion}`;

  return { currentNode: nodeVersion, issues, incompatibleCount, summary };
}
