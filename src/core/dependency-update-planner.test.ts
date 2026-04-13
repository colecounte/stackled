import { describe, it, expect } from 'vitest';
import {
  classifyUpdateType,
  isSafeUpdate,
  buildUpdatePlan,
  planUpdates,
} from './dependency-update-planner.js';
import { ParsedDependency } from '../types/index.js';

function makeDep(name: string, version: string): ParsedDependency {
  return { name, version, type: 'dependency', raw: `${name}@${version}` };
}

describe('classifyUpdateType', () => {
  it('returns patch for patch bump', () => {
    expect(classifyUpdateType('1.0.0', '1.0.1')).toBe('patch');
  });
  it('returns minor for minor bump', () => {
    expect(classifyUpdateType('1.0.0', '1.1.0')).toBe('minor');
  });
  it('returns major for major bump', () => {
    expect(classifyUpdateType('1.0.0', '2.0.0')).toBe('major');
  });
});

describe('isSafeUpdate', () => {
  it('patch-only: only patch is safe', () => {
    expect(isSafeUpdate('patch', 'patch-only')).toBe(true);
    expect(isSafeUpdate('minor', 'patch-only')).toBe(false);
    expect(isSafeUpdate('major', 'patch-only')).toBe(false);
  });
  it('minor-safe: patch and minor are safe', () => {
    expect(isSafeUpdate('patch', 'minor-safe')).toBe(true);
    expect(isSafeUpdate('minor', 'minor-safe')).toBe(true);
    expect(isSafeUpdate('major', 'minor-safe')).toBe(false);
  });
  it('major-all: all are safe', () => {
    expect(isSafeUpdate('major', 'major-all')).toBe(true);
  });
  it('security-only: nothing is safe by default', () => {
    expect(isSafeUpdate('patch', 'security-only')).toBe(false);
  });
});

describe('buildUpdatePlan', () => {
  it('marks security fix as safe under security-only strategy', () => {
    const dep = makeDep('lodash', '4.17.20');
    const plan = buildUpdatePlan(dep, '4.17.21', 'security-only', true);
    expect(plan.isSafe).toBe(true);
    expect(plan.reason).toMatch(/Security fix/);
  });

  it('marks major update as risky under minor-safe strategy', () => {
    const dep = makeDep('react', '17.0.0');
    const plan = buildUpdatePlan(dep, '18.0.0', 'minor-safe', false);
    expect(plan.isSafe).toBe(false);
    expect(plan.updateType).toBe('major');
  });

  it('includes correct version fields', () => {
    const dep = makeDep('axios', '1.3.0');
    const plan = buildUpdatePlan(dep, '1.3.5', 'patch-only');
    expect(plan.currentVersion).toBe('1.3.0');
    expect(plan.targetVersion).toBe('1.3.5');
    expect(plan.name).toBe('axios');
  });
});

describe('planUpdates', () => {
  const deps = [makeDep('a', '1.0.0'), makeDep('b', '2.0.0'), makeDep('c', '3.0.0')];
  const latest = { a: '1.0.1', b: '2.1.0', c: '4.0.0' };

  it('counts safe and risky correctly under minor-safe', () => {
    const summary = planUpdates(deps, latest, 'minor-safe');
    expect(summary.total).toBe(3);
    expect(summary.safe).toBe(2); // a(patch), b(minor)
    expect(summary.risky).toBe(1); // c(major)
  });

  it('skips packages without a known latest version', () => {
    const summary = planUpdates(deps, { a: '1.0.1' }, 'patch-only');
    expect(summary.skipped).toBe(2);
  });

  it('marks security packages safe under security-only', () => {
    const summary = planUpdates(deps, latest, 'security-only', new Set(['c']));
    const cPlan = summary.plans.find(p => p.name === 'c');
    expect(cPlan?.isSafe).toBe(true);
  });
});
