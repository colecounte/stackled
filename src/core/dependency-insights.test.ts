import {
  gradeFromInsightScore,
  buildInsights,
  calcInsightScore,
  buildInsightEntry,
  summarizeInsights,
  InsightEntry,
} from './dependency-insights';
import { ParsedDependency } from '../types';

function makeDep(name = 'lodash', version = '4.17.21'): ParsedDependency {
  return { name, version, type: 'dependency' };
}

describe('gradeFromInsightScore', () => {
  it('returns A for score >= 90', () => expect(gradeFromInsightScore(95)).toBe('A'));
  it('returns B for score >= 75', () => expect(gradeFromInsightScore(80)).toBe('B'));
  it('returns C for score >= 55', () => expect(gradeFromInsightScore(60)).toBe('C'));
  it('returns D for score >= 35', () => expect(gradeFromInsightScore(40)).toBe('D'));
  it('returns F for score < 35', () => expect(gradeFromInsightScore(20)).toBe('F'));
});

describe('buildInsights', () => {
  it('flags deprecated packages', () => {
    const insights = buildInsights(makeDep(), { deprecated: true });
    expect(insights).toContain('Package is deprecated');
  });

  it('flags low download count', () => {
    const insights = buildInsights(makeDep(), { weeklyDownloads: 500 });
    expect(insights).toContain('Low download count (<1k/week)');
  });

  it('flags highly popular packages', () => {
    const insights = buildInsights(makeDep(), { weeklyDownloads: 5_000_000 });
    expect(insights).toContain('Highly popular (>1M downloads/week)');
  });

  it('flags stale packages', () => {
    const old = new Date(Date.now() - 400 * 86_400_000).toISOString();
    const insights = buildInsights(makeDep(), { lastPublish: old });
    expect(insights.some(i => i.includes('No release'))).toBe(true);
  });

  it('flags pre-1.0 versions', () => {
    const insights = buildInsights(makeDep('alpha-pkg', '0.3.1'), {});
    expect(insights).toContain('Pre-1.0 — API may be unstable');
  });

  it('returns empty array for healthy package', () => {
    const recent = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const insights = buildInsights(makeDep(), { weeklyDownloads: 50_000, lastPublish: recent });
    expect(insights).toHaveLength(0);
  });
});

describe('calcInsightScore', () => {
  it('deducts 40 for deprecated', () => {
    const score = calcInsightScore(['Package is deprecated'], {});
    expect(score).toBe(60);
  });

  it('adds 5 for hasTypes', () => {
    const score = calcInsightScore([], { hasTypes: true });
    expect(score).toBe(105 > 100 ? 100 : 105);
  });

  it('does not go below 0', () => {
    const score = calcInsightScore(
      ['Package is deprecated', 'No release in 400 days', 'Low download count (<1k/week)', 'Pre-1.0 — API may be unstable'],
      {}
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('buildInsightEntry', () => {
  it('returns a complete entry', () => {
    const entry = buildInsightEntry(makeDep(), { weeklyDownloads: 50_000 });
    expect(entry.name).toBe('lodash');
    expect(entry.version).toBe('4.17.21');
    expect(typeof entry.score).toBe('number');
    expect(['A', 'B', 'C', 'D', 'F']).toContain(entry.grade);
  });
});

describe('summarizeInsights', () => {
  it('counts healthy, warnings, and critical', () => {
    const entries: InsightEntry[] = [
      { name: 'a', version: '1.0.0', insights: [], score: 95, grade: 'A' },
      { name: 'b', version: '1.0.0', insights: [], score: 60, grade: 'C' },
      { name: 'c', version: '1.0.0', insights: [], score: 20, grade: 'F' },
    ];
    const summary = summarizeInsights(entries);
    expect(summary.total).toBe(3);
    expect(summary.healthy).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.critical).toBe(1);
  });
});
