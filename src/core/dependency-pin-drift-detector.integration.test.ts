import { describe, it, expect } from 'vitest';
import { detectPinDrift, summarizePinDrift } from './dependency-pin-drift-detector.js';
import type { ParsedDependency } from '../types/index.js';

function dep(name: string, version: string): ParsedDependency {
  return { name, version, type: 'production' };
}

describe('detectPinDrift integration', () => {
  it('correctly identifies no drift when all resolved are latest', () => {
    const deps = [dep('chalk', '5.0.0'), dep('semver', '7.5.0')];
    const resolved = { chalk: '5.0.0', semver: '7.5.0' };
    const available = { chalk: ['5.0.0'], semver: ['7.5.0'] };
    const entries = detectPinDrift(deps, resolved, available);
    entries.forEach((e) => expect(e.driftLevel).toBe('none'));
  });

  it('detects severe drift for many versions behind', () => {
    const deps = [dep('react', '^17.0.0')];
    const resolved = { react: '17.0.0' };
    const available = {
      react: ['17.0.0', '17.0.1', '17.0.2', '18.0.0', '18.1.0', '18.2.0', '18.3.0'],
    };
    const entries = detectPinDrift(deps, resolved, available);
    expect(entries[0].driftLevel).toBe('severe');
    expect(entries[0].versionsBehind).toBe(6);
  });

  it('summarize reflects full picture', () => {
    const deps = [
      dep('a', '1.0.0'),
      dep('b', '^2.0.0'),
      dep('c', '~3.0.0'),
    ];
    const resolved = { a: '1.0.0', b: '2.0.0', c: '3.0.0' };
    const available = {
      a: ['1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6'],
      b: ['2.0.0', '2.0.1'],
      c: ['3.0.0'],
    };
    const entries = detectPinDrift(deps, resolved, available);
    const summary = summarizePinDrift(entries);
    expect(summary.total).toBe(3);
    expect(summary.severeCount).toBe(1);
    expect(summary.drifted).toBe(2);
    expect(summary.pinned).toBe(1);
  });
});
