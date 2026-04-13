import { detectRelicensedDependencies } from './dependency-relicense-detector';
import type { ParsedDependency } from '../types';

function makeDep(name: string, currentLicense: string, previousLicense: string): ParsedDependency {
  return {
    name,
    currentVersion: '2.0.0',
    specifiedVersion: '^2.0.0',
    type: 'dependency',
    registry: 'npm',
  } as ParsedDependency;
}

describe('detectRelicensedDependencies integration', () => {
  it('detects a permissive-to-copyleft relicense as high risk', () => {
    const deps: ParsedDependency[] = [makeDep('some-lib', 'GPL-3.0', 'MIT')];
    const packageInfoMap = {
      'some-lib': {
        name: 'some-lib',
        version: '2.0.0',
        license: 'GPL-3.0',
        previousLicense: 'MIT',
      },
    };
    const results = detectRelicensedDependencies(deps, packageInfoMap as any);
    expect(results).toHaveLength(1);
    expect(results[0].risk).toBe('high');
    expect(results[0].previousLicense).toBe('MIT');
    expect(results[0].currentLicense).toBe('GPL-3.0');
  });

  it('detects a copyleft-to-permissive relicense as low risk', () => {
    const deps: ParsedDependency[] = [makeDep('other-lib', 'MIT', 'GPL-3.0')];
    const packageInfoMap = {
      'other-lib': {
        name: 'other-lib',
        version: '2.0.0',
        license: 'MIT',
        previousLicense: 'GPL-3.0',
      },
    };
    const results = detectRelicensedDependencies(deps, packageInfoMap as any);
    expect(results).toHaveLength(1);
    expect(results[0].risk).toBe('low');
  });

  it('returns empty array when no relicensing detected', () => {
    const deps: ParsedDependency[] = [makeDep('stable-lib', 'MIT', 'MIT')];
    const packageInfoMap = {
      'stable-lib': {
        name: 'stable-lib',
        version: '1.0.0',
        license: 'MIT',
        previousLicense: 'MIT',
      },
    };
    const results = detectRelicensedDependencies(deps, packageInfoMap as any);
    expect(results).toHaveLength(0);
  });

  it('handles multiple deps with mixed relicense scenarios', () => {
    const deps: ParsedDependency[] = [
      makeDep('lib-a', 'AGPL-3.0', 'Apache-2.0'),
      makeDep('lib-b', 'ISC', 'ISC'),
      makeDep('lib-c', 'BSD-2-Clause', 'GPL-2.0'),
    ];
    const packageInfoMap = {
      'lib-a': { name: 'lib-a', version: '2.0.0', license: 'AGPL-3.0', previousLicense: 'Apache-2.0' },
      'lib-b': { name: 'lib-b', version: '1.5.0', license: 'ISC', previousLicense: 'ISC' },
      'lib-c': { name: 'lib-c', version: '3.0.0', license: 'BSD-2-Clause', previousLicense: 'GPL-2.0' },
    };
    const results = detectRelicensedDependencies(deps, packageInfoMap as any);
    expect(results).toHaveLength(2);
    const names = results.map((r) => r.name);
    expect(names).toContain('lib-a');
    expect(names).toContain('lib-c');
    expect(names).not.toContain('lib-b');
  });
});
