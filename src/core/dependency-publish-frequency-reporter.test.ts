import {
  calcAverageDaysBetweenAll,
  countByBand,
  deriveOverallBand,
  buildPublishFrequencyReport,
  formatPublishFrequencyReportAsText,
  formatPublishFrequencyReportAsJson,
} from './dependency-publish-frequency-reporter';
import type { PublishFrequencyEntry } from '../types';

function makeEntry(
  name: string,
  avgDays: number,
  band: string
): PublishFrequencyEntry {
  return {
    name,
    currentVersion: '1.0.0',
    releaseCount: 10,
    avgDaysBetweenReleases: avgDays,
    frequencyBand: band as any,
    firstReleaseDate: '2020-01-01',
    latestReleaseDate: '2024-01-01',
    summary: `${band} frequency`,
  };
}

describe('calcAverageDaysBetweenAll', () => {
  it('returns 0 for empty array', () => {
    expect(calcAverageDaysBetweenAll([])).toBe(0);
  });

  it('calculates average correctly', () => {
    const entries = [
      makeEntry('a', 10, 'high'),
      makeEntry('b', 30, 'moderate'),
    ];
    expect(calcAverageDaysBetweenAll(entries)).toBe(20);
  });
});

describe('countByBand', () => {
  it('counts entries matching band', () => {
    const entries = [
      makeEntry('a', 5, 'high'),
      makeEntry('b', 5, 'high'),
      makeEntry('c', 90, 'dormant'),
    ];
    expect(countByBand(entries, 'high')).toBe(2);
    expect(countByBand(entries, 'dormant')).toBe(1);
    expect(countByBand(entries, 'low')).toBe(0);
  });
});

describe('deriveOverallBand', () => {
  it('returns dormant when majority are dormant', () => {
    const entries = [
      makeEntry('a', 200, 'dormant'),
      makeEntry('b', 200, 'dormant'),
      makeEntry('c', 10, 'high'),
    ];
    expect(deriveOverallBand(entries)).toBe('dormant');
  });

  it('returns high when majority are high', () => {
    const entries = [
      makeEntry('a', 5, 'high'),
      makeEntry('b', 5, 'high'),
      makeEntry('c', 5, 'high'),
    ];
    expect(deriveOverallBand(entries)).toBe('high');
  });

  it('returns moderate as default', () => {
    const entries = [
      makeEntry('a', 30, 'moderate'),
      makeEntry('b', 30, 'moderate'),
    ];
    expect(deriveOverallBand(entries)).toBe('moderate');
  });
});

describe('buildPublishFrequencyReport', () => {
  it('builds a complete report', () => {
    const entries = [
      makeEntry('a', 5, 'high'),
      makeEntry('b', 200, 'dormant'),
      makeEntry('c', 60, 'low'),
    ];
    const report = buildPublishFrequencyReport(entries);
    expect(report.totalPackages).toBe(3);
    expect(report.highFrequencyCount).toBe(1);
    expect(report.dormantCount).toBe(1);
    expect(report.lowFrequencyCount).toBe(1);
    expect(report.averageAvgDaysBetween).toBe(88);
  });
});

describe('formatPublishFrequencyReportAsText', () => {
  it('includes key fields', () => {
    const entries = [makeEntry('pkg', 14, 'high')];
    const report = buildPublishFrequencyReport(entries);
    const text = formatPublishFrequencyReportAsText(report);
    expect(text).toContain('Total packages');
    expect(text).toContain('High frequency');
    expect(text).toContain('Overall band');
  });
});

describe('formatPublishFrequencyReportAsJson', () => {
  it('returns valid JSON', () => {
    const entries = [makeEntry('pkg', 14, 'high')];
    const report = buildPublishFrequencyReport(entries);
    const json = formatPublishFrequencyReportAsJson(report);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.totalPackages).toBe(1);
  });
});
