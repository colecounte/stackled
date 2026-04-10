import {
  groupByName,
  isDuplicate,
  buildDuplicateGroup,
  detectDuplicates,
  summarizeDuplicates,
} from './duplicate-detector';
import { ParsedDependency } from '../types';

function makeDep(
  name: string,
  currentVersion: string,
  resolvedPath?: string
): ParsedDependency {
  return { name, currentVersion, specifiedVersion: `^${currentVersion}`, resolvedPath, type: 'dependency' };
}

describe('groupByName', () => {
  it('groups deps by name', () => {
    const deps = [makeDep('lodash', '4.17.21'), makeDep('lodash', '4.16.0')];
    const map = groupByName(deps);
    expect(map.get('lodash')).toHaveLength(2);
  });

  it('handles unique packages', () => {
    const deps = [makeDep('react', '18.0.0'), makeDep('vue', '3.0.0')];
    const map = groupByName(deps);
    expect(map.size).toBe(2);
  });
});

describe('isDuplicate', () => {
  it('returns true when multiple versions exist', () => {
    const group = [makeDep('lodash', '4.17.21'), makeDep('lodash', '4.16.0')];
    expect(isDuplicate(group)).toBe(true);
  });

  it('returns false when all versions are the same', () => {
    const group = [makeDep('lodash', '4.17.21'), makeDep('lodash', '4.17.21')];
    expect(isDuplicate(group)).toBe(false);
  });

  it('returns false for single entry', () => {
    expect(isDuplicate([makeDep('react', '18.0.0')])).toBe(false);
  });
});

describe('buildDuplicateGroup', () => {
  it('builds a group with unique versions', () => {
    const group = [makeDep('lodash', '4.17.21', 'node_modules/a/node_modules/lodash'), makeDep('lodash', '4.16.0')];
    const result = buildDuplicateGroup('lodash', group);
    expect(result.name).toBe('lodash');
    expect(result.versions).toContain('4.17.21');
    expect(result.versions).toContain('4.16.0');
    expect(result.installedPaths).toHaveLength(2);
  });
});

describe('detectDuplicates', () => {
  it('returns only packages with multiple versions', () => {
    const deps = [
      makeDep('lodash', '4.17.21'),
      makeDep('lodash', '4.16.0'),
      makeDep('react', '18.0.0'),
    ];
    const result = detectDuplicates(deps);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
  });

  it('returns empty array when no duplicates', () => {
    const deps = [makeDep('react', '18.0.0'), makeDep('vue', '3.0.0')];
    expect(detectDuplicates(deps)).toHaveLength(0);
  });
});

describe('summarizeDuplicates', () => {
  it('summarizes correctly', () => {
    const duplicates = [
      { name: 'lodash', versions: ['4.17.21', '4.16.0'], installedPaths: [], wastedBytes: 50000 },
      { name: 'chalk', versions: ['4.0.0', '5.0.0'], installedPaths: [], wastedBytes: 10000 },
    ];
    const summary = summarizeDuplicates(duplicates);
    expect(summary.totalDuplicates).toBe(2);
    expect(summary.affectedPackages).toEqual(['lodash', 'chalk']);
    expect(summary.estimatedWaste).toBe(60000);
  });

  it('handles empty list', () => {
    const summary = summarizeDuplicates([]);
    expect(summary.totalDuplicates).toBe(0);
    expect(summary.estimatedWaste).toBe(0);
  });
});
