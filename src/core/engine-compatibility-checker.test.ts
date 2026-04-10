import { describe, it, expect, vi } from 'vitest';
import {
  checkEngineCompatibility,
  analyzeEngineCompatibility,
  EngineIssue,
} from './engine-compatibility-checker.js';
import { ParsedDependency } from '../types/index.js';

function makeDep(name: string): ParsedDependency {
  return { name, version: '1.0.0', type: 'dependency' };
}

describe('checkEngineCompatibility', () => {
  it('returns null when engines field is missing', () => {
    const result = checkEngineCompatibility(makeDep('foo'), undefined, '18.0.0');
    expect(result).toBeNull();
  });

  it('returns null when engines.node is missing', () => {
    const result = checkEngineCompatibility(makeDep('foo'), { npm: '>=8' }, '18.0.0');
    expect(result).toBeNull();
  });

  it('marks compatible when node satisfies range', () => {
    const result = checkEngineCompatibility(makeDep('bar'), { node: '>=16' }, '18.0.0');
    expect(result).not.toBeNull();
    expect(result!.compatible).toBe(true);
    expect(result!.severity).toBe('low');
  });

  it('marks incompatible when node does not satisfy range', () => {
    const result = checkEngineCompatibility(makeDep('baz'), { node: '>=20' }, '18.0.0');
    expect(result).not.toBeNull();
    expect(result!.compatible).toBe(false);
  });

  it('returns correct dep name', () => {
    const result = checkEngineCompatibility(makeDep('my-pkg'), { node: '>=16' }, '18.0.0');
    expect(result!.name).toBe('my-pkg');
  });
});

describe('analyzeEngineCompatibility', () => {
  const deps = [makeDep('alpha'), makeDep('beta'), makeDep('gamma')];
  const enginesMap: Record<string, Record<string, string>> = {
    alpha: { node: '>=16' },
    beta: { node: '>=20' },
    gamma: { node: '>=18' },
  };

  it('returns zero issues when all compatible', () => {
    const result = analyzeEngineCompatibility(deps, enginesMap, '20.0.0');
    expect(result.incompatibleCount).toBe(0);
    expect(result.issues).toHaveLength(0);
  });

  it('detects incompatible dependencies', () => {
    const result = analyzeEngineCompatibility(deps, enginesMap, '16.0.0');
    expect(result.incompatibleCount).toBeGreaterThan(0);
    const names = result.issues.map((i: EngineIssue) => i.name);
    expect(names).toContain('beta');
    expect(names).toContain('gamma');
  });

  it('summary reflects no issues', () => {
    const result = analyzeEngineCompatibility(deps, enginesMap, '22.0.0');
    expect(result.summary).toMatch(/compatible/i);
  });

  it('summary reflects issues found', () => {
    const result = analyzeEngineCompatibility(deps, enginesMap, '14.0.0');
    expect(result.summary).toMatch(/incompatible/i);
  });

  it('uses currentNode from process.version when not provided', () => {
    const result = analyzeEngineCompatibility([], {});
    expect(result.currentNode).toBe(process.version);
  });
});
