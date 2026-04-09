import { generateReport } from './report-generator';
import { DependencyAnalysis, BreakingChange, ImpactScore } from '../types';

const mockAnalysis: DependencyAnalysis[] = [
  { name: 'react', currentVersion: '17.0.0', latestVersion: '18.2.0', isOutdated: true },
  { name: 'lodash', currentVersion: '4.17.21', latestVersion: '4.17.21', isOutdated: false },
  { name: 'axios', currentVersion: '0.21.0', latestVersion: '1.6.0', isOutdated: true },
];

const mockBreakingChanges: BreakingChange[] = [
  { description: 'Removed legacy API', version: '18.0.0', severity: 'high' },
];

const mockImpactScore: ImpactScore = { score: 8, reasons: ['widely used', 'core dependency'] };

describe('generateReport', () => {
  it('should return correct totals', () => {
    const breakingMap = new Map([['react', mockBreakingChanges]]);
    const impactMap = new Map([['react', mockImpactScore]]);

    const report = generateReport(mockAnalysis, breakingMap, impactMap);

    expect(report.totalDependencies).toBe(3);
    expect(report.outdatedCount).toBe(2);
    expect(report.breakingChangesCount).toBe(1);
    expect(report.highImpactCount).toBe(1);
  });

  it('should include a generatedAt timestamp', () => {
    const report = generateReport(mockAnalysis, new Map(), new Map());
    expect(typeof report.generatedAt).toBe('string');
    expect(new Date(report.generatedAt).toString()).not.toBe('Invalid Date');
  });

  it('should recommend hold for high-impact breaking changes', () => {
    const breakingMap = new Map([['react', mockBreakingChanges]]);
    const impactMap = new Map([['react', mockImpactScore]]);

    const report = generateReport(mockAnalysis, breakingMap, impactMap);
    const reactEntry = report.dependencies.find((d) => d.name === 'react');

    expect(reactEntry?.recommendation).toMatch(/Hold/);
  });

  it('should recommend review for breaking changes without high impact', () => {
    const lowImpact: ImpactScore = { score: 3, reasons: ['minor usage'] };
    const breakingMap = new Map([['axios', mockBreakingChanges]]);
    const impactMap = new Map([['axios', lowImpact]]);

    const report = generateReport(mockAnalysis, breakingMap, impactMap);
    const axiosEntry = report.dependencies.find((d) => d.name === 'axios');

    expect(axiosEntry?.recommendation).toMatch(/Review/);
  });

  it('should recommend safe upgrade when outdated with no breaking changes', () => {
    const report = generateReport(mockAnalysis, new Map(), new Map());
    const axiosEntry = report.dependencies.find((d) => d.name === 'axios');

    expect(axiosEntry?.recommendation).toMatch(/Safe to upgrade/);
  });

  it('should mark up-to-date dependencies correctly', () => {
    const report = generateReport(mockAnalysis, new Map(), new Map());
    const lodashEntry = report.dependencies.find((d) => d.name === 'lodash');

    expect(lodashEntry?.isOutdated).toBe(false);
    expect(lodashEntry?.recommendation).toBe('Up to date');
  });
});
