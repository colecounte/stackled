import { printTrendTable } from './trend-command';
import { TrendSummary } from '../core/trend-analyzer';

const mockSummaries: TrendSummary[] = [
  {
    packageName: 'react',
    releaseFrequency: 'medium',
    daysSinceLastRelease: 15,
    releasesLast90Days: 4,
    trend: 'steady',
    averageDaysBetweenReleases: 22,
  },
  {
    packageName: 'lodash',
    releaseFrequency: 'stale',
    daysSinceLastRelease: 400,
    releasesLast90Days: 0,
    trend: 'abandoned',
    averageDaysBetweenReleases: 0,
  },
  {
    packageName: 'typescript',
    releaseFrequency: 'high',
    daysSinceLastRelease: 3,
    releasesLast90Days: 12,
    trend: 'accelerating',
    averageDaysBetweenReleases: 7,
  },
];

describe('printTrendTable', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('prints a header and rows for each summary', () => {
    printTrendTable(mockSummaries);
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('react');
    expect(output).toContain('lodash');
    expect(output).toContain('typescript');
  });

  it('prints abandoned icon for stale packages', () => {
    printTrendTable(mockSummaries);
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('abandoned');
    expect(output).toContain('💀');
  });

  it('prints accelerating icon for active packages', () => {
    printTrendTable(mockSummaries);
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('📈');
  });

  it('shows a message when no summaries provided', () => {
    printTrendTable([]);
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('No trend data available');
  });

  it('displays days since last release', () => {
    printTrendTable([mockSummaries[1]]);
    const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('400d ago');
  });
});
