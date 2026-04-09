import {
  diffVersions,
  isStableVersion,
  isNewerVersion,
  coerceVersion,
  sortVersionsDesc,
} from './semver-utils';

describe('diffVersions', () => {
  it('identifies a major bump', () => {
    const result = diffVersions('1.2.3', '2.0.0');
    expect(result.type).toBe('major');
    expect(result.distance).toBe(1);
  });

  it('identifies a minor bump', () => {
    const result = diffVersions('1.2.3', '1.4.0');
    expect(result.type).toBe('minor');
  });

  it('identifies a patch bump', () => {
    const result = diffVersions('1.2.3', '1.2.9');
    expect(result.type).toBe('patch');
  });

  it('returns unknown for identical versions', () => {
    const result = diffVersions('1.0.0', '1.0.0');
    expect(result.type).toBe('unknown');
  });

  it('calculates multi-major distance', () => {
    const result = diffVersions('1.0.0', '4.0.0');
    expect(result.distance).toBe(3);
  });
});

describe('isStableVersion', () => {
  it('returns true for stable releases', () => {
    expect(isStableVersion('1.2.3')).toBe(true);
  });

  it('returns false for prerelease versions', () => {
    expect(isStableVersion('1.2.3-alpha.1')).toBe(false);
    expect(isStableVersion('2.0.0-beta')).toBe(false);
  });

  it('returns false for invalid versions', () => {
    expect(isStableVersion('not-a-version')).toBe(false);
  });
});

describe('isNewerVersion', () => {
  it('returns true when candidate is newer', () => {
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
  });

  it('returns false when candidate is older', () => {
    expect(isNewerVersion('2.0.0', '1.0.0')).toBe(false);
  });

  it('returns false for equal versions', () => {
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('coerceVersion', () => {
  it('coerces a loose version string', () => {
    expect(coerceVersion('v1.2')).toBe('1.2.0');
    expect(coerceVersion('3')).toBe('3.0.0');
  });

  it('returns null for uncoerceable strings', () => {
    expect(coerceVersion('totally-invalid')).toBeNull();
  });
});

describe('sortVersionsDesc', () => {
  it('sorts versions in descending order', () => {
    const sorted = sortVersionsDesc(['1.0.0', '3.0.0', '2.1.0']);
    expect(sorted).toEqual(['3.0.0', '2.1.0', '1.0.0']);
  });

  it('filters out invalid versions', () => {
    const sorted = sortVersionsDesc(['1.0.0', 'invalid', '2.0.0']);
    expect(sorted).toEqual(['2.0.0', '1.0.0']);
  });
});
