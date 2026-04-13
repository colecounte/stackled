import {
  calcAverageScore,
  countHighComplexity,
  overallGrade,
  buildComplexityReport,
  formatComplexityReportAsText,
  formatComplexityReportAsJson,
} from './dependency-complexity-reporter';
import { ComplexityEntry } from '../types';

function makeEntry(name: string, score: number, grade: string): ComplexityEntry {
  return { name, version: '1.0.0', score, grade, depth: 1, versionSpread: 1, transitiveDeps: 2 };
}

describe('calcAverageScore', () => {
  it('returns 0 for empty list', () => expect(calcAverageScore([])).toBe(0));
  it('calculates average correctly', () => {
    const entries = [makeEntry('a', 20, 'A'), makeEntry('b', 60, 'C')];
    expect(calcAverageScore(entries)).toBe(40);
  });
});

describe('countHighComplexity', () => {
  it('counts entries with score >= 70', () => {
    const entries = [makeEntry('a', 50, 'C'), makeEntry('b', 80, 'D'), makeEntry('c', 90, 'F')];
    expect(countHighComplexity(entries)).toBe(2);
  });
  it('returns 0 when none are high', () => {
    expect(countHighComplexity([makeEntry('a', 30, 'B')])).toBe(0);
  });
});

describe('overallGrade', () => {
  it('grades A for low average', () => expect(overallGrade(10)).toBe('A'));
  it('grades F for high average', () => expect(overallGrade(90)).toBe('F'));
});

describe('buildComplexityReport', () => {
  it('builds report with correct fields', () => {
    const entries = [makeEntry('x', 20, 'A'), makeEntry('y', 80, 'D')];
    const report = buildComplexityReport(entries);
    expect(report.entries).toHaveLength(2);
    expect(report.averageScore).toBe(50);
    expect(report.highComplexityCount).toBe(1);
    expect(report.summary).toContain('1 of 2');
  });

  it('uses positive summary when no high complexity', () => {
    const entries = [makeEntry('a', 10, 'A')];
    const report = buildComplexityReport(entries);
    expect(report.summary).toContain('acceptable');
  });
});

describe('formatComplexityReportAsText', () => {
  it('includes overall grade', () => {
    const report = buildComplexityReport([makeEntry('pkg', 30, 'B')]);
    const text = formatComplexityReportAsText(report);
    expect(text).toContain('Overall Grade');
    expect(text).toContain('pkg');
  });
});

describe('formatComplexityReportAsJson', () => {
  it('returns valid JSON', () => {
    const report = buildComplexityReport([makeEntry('pkg', 30, 'B')]);
    const json = formatComplexityReportAsJson(report);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
