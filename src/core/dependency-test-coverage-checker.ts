import { PackageInfo } from '../types';

export type CoverageBand = 'high' | 'medium' | 'low' | 'unknown';

export interface TestCoverageEntry {
  name: string;
  version: string;
  hasTests: boolean;
  coverageBand: CoverageBand;
  testFilesCount: number;
  flags: string[];
}

export interface TestCoverageSummary {
  total: number;
  withTests: number;
  withoutTests: number;
  highCoverage: number;
  unknownCoverage: number;
}

export function classifyCoverageBand(testFilesCount: number, hasTests: boolean): CoverageBand {
  if (!hasTests) return 'unknown';
  if (testFilesCount >= 10) return 'high';
  if (testFilesCount >= 3) return 'medium';
  return 'low';
}

export function buildCoverageFlags(entry: Pick<TestCoverageEntry, 'hasTests' | 'coverageBand'>): string[] {
  const flags: string[] = [];
  if (!entry.hasTests) flags.push('no-tests-detected');
  if (entry.coverageBand === 'low') flags.push('low-test-coverage');
  if (entry.coverageBand === 'unknown') flags.push('coverage-unknown');
  return flags;
}

export function buildTestCoverageEntry(pkg: PackageInfo): TestCoverageEntry {
  const keywords: string[] = (pkg as any).keywords ?? [];
  const hasTests =
    keywords.includes('tested') ||
    keywords.includes('coverage') ||
    typeof (pkg as any).testCoverage === 'number';

  const testFilesCount: number = (pkg as any).testFilesCount ?? (hasTests ? 5 : 0);
  const coverageBand = classifyCoverageBand(testFilesCount, hasTests);
  const flags = buildCoverageFlags({ hasTests, coverageBand });

  return {
    name: pkg.name,
    version: pkg.version,
    hasTests,
    coverageBand,
    testFilesCount,
    flags,
  };
}

export function checkTestCoverage(packages: PackageInfo[]): TestCoverageEntry[] {
  return packages.map(buildTestCoverageEntry);
}

export function summarizeTestCoverage(entries: TestCoverageEntry[]): TestCoverageSummary {
  return {
    total: entries.length,
    withTests: entries.filter((e) => e.hasTests).length,
    withoutTests: entries.filter((e) => !e.hasTests).length,
    highCoverage: entries.filter((e) => e.coverageBand === 'high').length,
    unknownCoverage: entries.filter((e) => e.coverageBand === 'unknown').length,
  };
}
