import { describe, it, expect } from 'vitest';
import { planUpdates } from './dependency-update-planner.js';
import { ParsedDependency } from '../types/index.js';

function dep(name: string, version: string): ParsedDependency {
  return { name, version, type: 'dependency', raw: `${name}@${version}` };
}

describe('planUpdates integration', () => {
  const deps = [
    dep('express', '4.18.0'),
    dep('react', '17.0.2'),
    dep('lodash', '4.17.20'),
    dep('typescript', '4.9.5'),
  ];

  const latest = {
    express: '4.18.3',
    react: '18.2.0',
    lodash: '4.17.21',
    typescript: '5.4.5',
  };

  it('patch-only strategy only includes patch updates', () => {
    const summary = planUpdates(deps, latest, 'patch-only');
    expect(summary.plans.every(p => p.updateType === 'patch')).toBe(true);
    expect(summary.plans.map(p => p.name)).toContain('lodash');
    expect(summary.plans.map(p => p.name)).not.toContain('react');
  });

  it('minor-safe strategy excludes major updates', () => {
    const summary = planUpdates(deps, latest, 'minor-safe');
    const risky = summary.plans.filter(p => !p.isSafe);
    expect(risky.every(p => p.updateType === 'major')).toBe(true);
  });

  it('major-all strategy marks everything safe', () => {
    const summary = planUpdates(deps, latest, 'major-all');
    expect(summary.safe).toBe(summary.total);
    expect(summary.risky).toBe(0);
  });

  it('security-only marks only security packages as safe', () => {
    const secPkgs = new Set(['react']);
    const summary = planUpdates(deps, latest, 'security-only', secPkgs);
    const reactPlan = summary.plans.find(p => p.name === 'react');
    const expressPlan = summary.plans.find(p => p.name === 'express');
    expect(reactPlan?.isSafe).toBe(true);
    expect(expressPlan?.isSafe).toBe(false);
  });

  it('skips packages already at latest version', () => {
    const alreadyCurrent = [dep('lodash', '4.17.21')];
    const summary = planUpdates(alreadyCurrent, { lodash: '4.17.21' }, 'minor-safe');
    expect(summary.total).toBe(0);
    expect(summary.skipped).toBe(1);
  });
});
