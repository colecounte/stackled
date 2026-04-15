import { describe, it, expect } from 'vitest';
import type { ParsedDependency } from '../types/index.js';
import {
  isPinned,
  classifyDriftLevel,
  buildPinDriftEntry,
  detectPinDrift,
  summarizePinDrift,
} from './dependency-pin-drift-detector.js';

function makeDep(name: string, version: string): ParsedDependency {
  return { name, version, type: 'production' };
}

describe('isPinned', () => {
  it('returns true for exact version', () => {
    expect(isPinned('1.2.3')).toBe(true);
  });
  it('returns false for caret range', () => {
    expect(isPinned('^1.2.3')).toBe(false);
  });
  it('returns false for tilde range', () => {
    expect(isPinned('~1.2.3')).toBe(false);
  });
  it('returns true for = prefix', () => {
    expect(isPinned('=2.0.0')).toBe(true);
  });
});

describe('classifyDriftLevel', () => {
  it('returns none when no newer versions', () => {
    expect(classifyDriftLevel('^1.0.0', '1.0.0', ['1.0.0'])).toBe('none');
  });
  it('returns minor when 1-2 versions behind', () => {
    expect(classifyDriftLevel('^1.0.0', '1.0.0', ['1.0.0', '1.0.1', '1.0.2'])).toBe('minor');
  });
  it('returns moderate when 3-5 versions behind', () => {
    const versions = ['1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5'];
    expect(classifyDriftLevel('^1.0.0', '1.0.0', versions)).toBe('moderate');
  });
  it('returns severe when more than 5 versions behind', () => {
    const versions = ['1.0.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.0.6'];
    expect(classifyDriftLevel('^1.0.0', '1.0.0', versions)).toBe('severe');
  });
});

describe('buildPinDriftEntry', () => {
  it('builds entry with correct drift info', () => {
    const dep = makeDep('lodash', '4.17.0');
    const entry = buildPinDriftEntry(dep, '4.17.0', ['4.17.0', '4.17.1', '4.17.2']);
    expect(entry.name).toBe('lodash');
    expect(entry.versionsBehind).toBe(2);
    expect(entry.driftLevel).toBe('minor');
    expect(entry.isPinned).toBe(true);
  });
});

describe('detectPinDrift', () => {
  it('maps deps to drift entries', () => {
    const deps = [makeDep('react', '^18.0.0'), makeDep('lodash', '4.17.0')];
    const resolved = { react: '18.0.0', lodash: '4.17.0' };
    const available = { react: ['18.0.0', '18.1.0'], lodash: ['4.17.0'] };
    const entries = detectPinDrift(deps, resolved, available);
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('react');
  });
});

describe('summarizePinDrift', () => {
  it('counts correctly', () => {
    const deps = [makeDep('a', '1.0.0'), makeDep('b', '^2.0.0')];
    const entries = detectPinDrift(
      deps,
      { a: '1.0.0', b: '2.0.0' },
      { a: [], b: ['2.0.0', '2.1.0', '2.2.0', '2.3.0', '2.4.0', '2.5.0', '2.6.0'] }
    );
    const summary = summarizePinDrift(entries);
    expect(summary.total).toBe(2);
    expect(summary.pinned).toBe(1);
    expect(summary.severeCount).toBe(1);
  });
});
