import { describe, it, expect } from 'vitest';
import {
  checkResolutionCompatibility,
  buildResolutionEntry,
  checkResolutions,
  summarizeResolutions,
} from './resolutions-checker.js';
import { ParsedDependency } from '../types/index.js';

function makeDep(name: string, version: string): ParsedDependency {
  return { name, version, type: 'dependency' };
}

describe('checkResolutionCompatibility', () => {
  it('returns empty array when all ranges satisfied', () => {
    expect(checkResolutionCompatibility('2.1.0', ['^2.0.0', '>=2.0.0'])).toEqual([]);
  });

  it('returns conflicting ranges', () => {
    const conflicts = checkResolutionCompatibility('2.1.0', ['^2.0.0', '^3.0.0']);
    expect(conflicts).toEqual(['^3.0.0']);
  });

  it('returns all ranges when none satisfied', () => {
    const conflicts = checkResolutionCompatibility('1.0.0', ['^2.0.0', '^3.0.0']);
    expect(conflicts).toHaveLength(2);
  });
});

describe('buildResolutionEntry', () => {
  it('marks entry as compatible when no conflicts', () => {
    const entry = buildResolutionEntry('lodash', '4.17.21', [makeDep('lodash', '^4.0.0')]);
    expect(entry.isCompatible).toBe(true);
    expect(entry.conflicts).toHaveLength(0);
  });

  it('marks entry as incompatible when conflicts exist', () => {
    const entry = buildResolutionEntry('lodash', '3.0.0', [makeDep('lodash', '^4.0.0')]);
    expect(entry.isCompatible).toBe(false);
    expect(entry.conflicts).toContain('^4.0.0');
  });

  it('includes all requiredBy entries', () => {
    const entry = buildResolutionEntry('react', '18.0.0', [
      makeDep('react', '^18.0.0'),
      makeDep('react', '>=17.0.0'),
    ]);
    expect(entry.requiredBy).toHaveLength(2);
  });
});

describe('checkResolutions', () => {
  it('returns summary with all compatible', () => {
    const result = checkResolutions(
      { lodash: '4.17.21' },
      [makeDep('lodash', '^4.0.0')]
    );
    expect(result.total).toBe(1);
    expect(result.compatible).toBe(1);
    expect(result.incompatible).toBe(0);
  });

  it('counts incompatible correctly', () => {
    const result = checkResolutions(
      { lodash: '3.0.0', react: '18.0.0' },
      [makeDep('lodash', '^4.0.0'), makeDep('react', '^18.0.0')]
    );
    expect(result.incompatible).toBe(1);
  });

  it('returns empty summary for no resolutions', () => {
    const result = checkResolutions({}, []);
    expect(result.total).toBe(0);
  });
});

describe('summarizeResolutions', () => {
  it('returns message for no resolutions', () => {
    expect(summarizeResolutions({ total: 0, compatible: 0, incompatible: 0, entries: [] })).toContain('No resolutions');
  });

  it('returns all-compatible message', () => {
    expect(summarizeResolutions({ total: 3, compatible: 3, incompatible: 0, entries: [] })).toContain('compatible');
  });

  it('returns conflict message', () => {
    expect(summarizeResolutions({ total: 3, compatible: 2, incompatible: 1, entries: [] })).toContain('conflicts');
  });
});
