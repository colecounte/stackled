import {
  resolveVersion,
  isVersionRange,
  satisfiesRange,
  resolveDependencyVersions,
  getLatestSatisfying,
} from './version-resolver';
import { Dependency } from '../types/index';

describe('resolveVersion', () => {
  it('should clean a valid semver version', () => {
    expect(resolveVersion('v1.2.3')).toBe('1.2.3');
  });

  it('should coerce a partial version', () => {
    expect(resolveVersion('1.2')).toBe('1.2.0');
  });

  it('should return null for invalid version', () => {
    expect(resolveVersion('not-a-version')).toBeNull();
  });

  it('should handle already clean version', () => {
    expect(resolveVersion('2.0.0')).toBe('2.0.0');
  });
});

describe('isVersionRange', () => {
  it('should detect caret ranges', () => {
    expect(isVersionRange('^1.2.3')).toBe(true);
  });

  it('should detect tilde ranges', () => {
    expect(isVersionRange('~1.2.3')).toBe(true);
  });

  it('should return false for exact versions', () => {
    expect(isVersionRange('1.2.3')).toBe(false);
  });

  it('should detect wildcard ranges', () => {
    expect(isVersionRange('1.x')).toBe(true);
  });
});

describe('satisfiesRange', () => {
  it('should return true when version satisfies range', () => {
    expect(satisfiesRange('1.5.0', '^1.0.0')).toBe(true);
  });

  it('should return false when version does not satisfy range', () => {
    expect(satisfiesRange('2.0.0', '^1.0.0')).toBe(false);
  });

  it('should return false for invalid version', () => {
    expect(satisfiesRange('invalid', '^1.0.0')).toBe(false);
  });
});

describe('resolveDependencyVersions', () => {
  const deps: Dependency[] = [
    { name: 'react', currentVersion: '^18.0.0', latestVersion: '18.2.0', type: 'dependency' },
    { name: 'lodash', currentVersion: '4.17.21', latestVersion: '4.17.21', type: 'dependency' },
    { name: 'bad-pkg', currentVersion: 'invalid', latestVersion: '1.0.0', type: 'devDependency' },
  ];

  it('should mark range versions as ranges', () => {
    const results = resolveDependencyVersions(deps);
    expect(results[0].isRange).toBe(true);
    expect(results[1].isRange).toBe(false);
  });

  it('should mark invalid versions as not valid', () => {
    const results = resolveDependencyVersions(deps);
    expect(results[2].isValid).toBe(false);
  });

  it('should resolve valid exact versions', () => {
    const results = resolveDependencyVersions(deps);
    expect(results[1].resolvedVersion).toBe('4.17.21');
  });
});

describe('getLatestSatisfying', () => {
  const versions = ['1.0.0', '1.5.0', '2.0.0', '2.1.0', '3.0.0'];

  it('should return latest version satisfying range', () => {
    expect(getLatestSatisfying(versions, '^1.0.0')).toBe('1.5.0');
  });

  it('should return null when no version satisfies range', () => {
    expect(getLatestSatisfying(versions, '^4.0.0')).toBeNull();
  });

  it('should handle exact version range', () => {
    expect(getLatestSatisfying(versions, '2.0.0')).toBe('2.0.0');
  });
});
