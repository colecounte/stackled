import {
  classifyCoverageBand,
  buildCoverageFlags,
  buildTestCoverageEntry,
  checkTestCoverage,
  summarizeTestCoverage,
  TestCoverageEntry,
} from './dependency-test-coverage-checker';
import { PackageInfo } from '../types';

function makePkg(overrides: Partial<PackageInfo> & Record<string, unknown> = {}): PackageInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    description: '',
    license: 'MIT',
    ...overrides,
  } as PackageInfo;
}

describe('classifyCoverageBand', () => {
  it('returns unknown when no tests', () => {
    expect(classifyCoverageBand(0, false)).toBe('unknown');
  });

  it('returns low for 1-2 test files', () => {
    expect(classifyCoverageBand(2, true)).toBe('low');
  });

  it('returns medium for 3-9 test files', () => {
    expect(classifyCoverageBand(5, true)).toBe('medium');
  });

  it('returns high for 10+ test files', () => {
    expect(classifyCoverageBand(12, true)).toBe('high');
  });
});

describe('buildCoverageFlags', () => {
  it('flags no-tests-detected when hasTests is false', () => {
    const flags = buildCoverageFlags({ hasTests: false, coverageBand: 'unknown' });
    expect(flags).toContain('no-tests-detected');
    expect(flags).toContain('coverage-unknown');
  });

  it('flags low-test-coverage for low band', () => {
    const flags = buildCoverageFlags({ hasTests: true, coverageBand: 'low' });
    expect(flags).toContain('low-test-coverage');
  });

  it('returns empty flags for high coverage', () => {
    const flags = buildCoverageFlags({ hasTests: true, coverageBand: 'high' });
    expect(flags).toHaveLength(0);
  });
});

describe('buildTestCoverageEntry', () => {
  it('detects tests via keywords', () => {
    const pkg = makePkg({ keywords: ['tested', 'utility'] } as any);
    const entry = buildTestCoverageEntry(pkg);
    expect(entry.hasTests).toBe(true);
  });

  it('returns unknown band when no keywords signal tests', () => {
    const pkg = makePkg({ keywords: [] } as any);
    const entry = buildTestCoverageEntry(pkg);
    expect(entry.coverageBand).toBe('unknown');
    expect(entry.hasTests).toBe(false);
  });

  it('uses testFilesCount from pkg if provided', () => {
    const pkg = makePkg({ keywords: ['tested'], testFilesCount: 15 } as any);
    const entry = buildTestCoverageEntry(pkg);
    expect(entry.testFilesCount).toBe(15);
    expect(entry.coverageBand).toBe('high');
  });
});

describe('checkTestCoverage', () => {
  it('returns one entry per package', () => {
    const pkgs = [makePkg({ name: 'a' }), makePkg({ name: 'b' })];
    const results = checkTestCoverage(pkgs);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.name)).toEqual(['a', 'b']);
  });
});

describe('summarizeTestCoverage', () => {
  it('counts entries correctly', () => {
    const entries: TestCoverageEntry[] = [
      { name: 'a', version: '1.0.0', hasTests: true, coverageBand: 'high', testFilesCount: 10, flags: [] },
      { name: 'b', version: '1.0.0', hasTests: true, coverageBand: 'low', testFilesCount: 2, flags: ['low-test-coverage'] },
      { name: 'c', version: '1.0.0', hasTests: false, coverageBand: 'unknown', testFilesCount: 0, flags: ['no-tests-detected'] },
    ];
    const summary = summarizeTestCoverage(entries);
    expect(summary.total).toBe(3);
    expect(summary.withTests).toBe(2);
    expect(summary.withoutTests).toBe(1);
    expect(summary.highCoverage).toBe(1);
    expect(summary.unknownCoverage).toBe(1);
  });
});
