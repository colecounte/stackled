import {
  classifyGapSeverity,
  findMissingVersions,
  buildGap,
  detectChangelogGaps,
  summarizeGaps,
} from './changelog-gap-detector';

describe('classifyGapSeverity', () => {
  it('returns low for 1 gap', () => {
    expect(classifyGapSeverity(1)).toBe('low');
  });

  it('returns medium for 2 gaps', () => {
    expect(classifyGapSeverity(2)).toBe('medium');
  });

  it('returns high for 5 or more gaps', () => {
    expect(classifyGapSeverity(5)).toBe('high');
    expect(classifyGapSeverity(10)).toBe('high');
  });
});

describe('findMissingVersions', () => {
  const available = ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'];

  it('returns versions strictly between installed and latest', () => {
    const result = findMissingVersions('1.0.0', '2.0.0', available);
    expect(result).toContain('1.1.0');
    expect(result).toContain('1.2.0');
    expect(result).toContain('2.0.0');
    expect(result).not.toContain('1.0.0');
    expect(result).not.toContain('2.1.0');
  });

  it('returns empty array when already on latest', () => {
    const result = findMissingVersions('2.1.0', '2.1.0', available);
    expect(result).toHaveLength(0);
  });
});

describe('buildGap', () => {
  it('builds a gap entry with correct severity', () => {
    const gap = buildGap('lodash', '4.0.0', '4.3.0', [
      '4.0.0',
      '4.1.0',
      '4.2.0',
      '4.3.0',
    ]);
    expect(gap.name).toBe('lodash');
    expect(gap.missingVersions).toContain('4.1.0');
    expect(gap.gapCount).toBe(3);
    expect(gap.severity).toBe('medium');
  });

  it('returns gapCount 0 when up to date', () => {
    const gap = buildGap('react', '18.0.0', '18.0.0', ['18.0.0']);
    expect(gap.gapCount).toBe(0);
  });
});

describe('detectChangelogGaps', () => {
  it('filters out packages with no gaps', () => {
    const result = detectChangelogGaps([
      {
        name: 'up-to-date',
        installedVersion: '1.0.0',
        latestVersion: '1.0.0',
        availableVersions: ['1.0.0'],
      },
      {
        name: 'behind',
        installedVersion: '1.0.0',
        latestVersion: '1.2.0',
        availableVersions: ['1.0.0', '1.1.0', '1.2.0'],
      },
    ]);
    expect(result.affectedPackages).toBe(1);
    expect(result.totalMissing).toBe(2);
    expect(result.gaps[0].name).toBe('behind');
  });

  it('returns zeros when all packages are current', () => {
    const result = detectChangelogGaps([]);
    expect(result.affectedPackages).toBe(0);
    expect(result.totalMissing).toBe(0);
  });
});

describe('summarizeGaps', () => {
  it('returns no-gap message when none found', () => {
    const msg = summarizeGaps({ gaps: [], totalMissing: 0, affectedPackages: 0 });
    expect(msg).toMatch(/no changelog gaps/i);
  });

  it('includes counts in summary', () => {
    const msg = summarizeGaps({
      gaps: [] as any,
      totalMissing: 5,
      affectedPackages: 2,
    });
    expect(msg).toContain('2 package(s)');
    expect(msg).toContain('5 missing');
  });
});
