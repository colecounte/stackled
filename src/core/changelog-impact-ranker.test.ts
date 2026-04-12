import {
  calcImpactScore,
  classifyImpact,
  buildReasons,
  rankChangelogImpacts,
} from './changelog-impact-ranker';
import { ChangelogSummary } from '../types';

function makeSummary(overrides: Partial<ChangelogSummary> = {}): ChangelogSummary {
  return {
    hasSecurityFixes: false,
    hasDeprecationNotices: false,
    highlights: [],
    totalChanges: 0,
    ...overrides,
  };
}

describe('calcImpactScore', () => {
  it('returns 0 for empty summary', () => {
    expect(calcImpactScore(makeSummary())).toBe(0);
  });

  it('adds 40 for security fixes', () => {
    expect(calcImpactScore(makeSummary({ hasSecurityFixes: true }))).toBe(40);
  });

  it('adds 20 for deprecation notices', () => {
    expect(calcImpactScore(makeSummary({ hasDeprecationNotices: true }))).toBe(20);
  });

  it('adds 15 per breaking change highlight', () => {
    const summary = makeSummary({ highlights: ['BREAKING: removed API', 'BREAKING: changed config'] });
    expect(calcImpactScore(summary)).toBe(30);
  });

  it('caps total changes contribution at 20', () => {
    const score = calcImpactScore(makeSummary({ totalChanges: 100 }));
    expect(score).toBe(20);
  });

  it('caps total score at 100', () => {
    const summary = makeSummary({
      hasSecurityFixes: true,
      hasDeprecationNotices: true,
      highlights: ['BREAKING: a', 'BREAKING: b', 'BREAKING: c'],
      totalChanges: 50,
    });
    expect(calcImpactScore(summary)).toBe(100);
  });
});

describe('classifyImpact', () => {
  it('returns critical for score >= 70', () => expect(classifyImpact(70)).toBe('critical'));
  it('returns high for score >= 45', () => expect(classifyImpact(50)).toBe('high'));
  it('returns medium for score >= 20', () => expect(classifyImpact(25)).toBe('medium'));
  it('returns low for score < 20', () => expect(classifyImpact(10)).toBe('low'));
});

describe('buildReasons', () => {
  it('returns empty array for clean summary', () => {
    expect(buildReasons(makeSummary())).toEqual([]);
  });

  it('includes security fix reason', () => {
    const reasons = buildReasons(makeSummary({ hasSecurityFixes: true }));
    expect(reasons).toContain('Contains security fixes');
  });

  it('includes deprecation reason', () => {
    const reasons = buildReasons(makeSummary({ hasDeprecationNotices: true }));
    expect(reasons).toContain('Includes deprecation notices');
  });

  it('includes breaking change count', () => {
    const reasons = buildReasons(makeSummary({ highlights: ['BREAKING: x'] }));
    expect(reasons).toContain('1 breaking change(s) detected');
  });

  it('includes high change volume reason', () => {
    const reasons = buildReasons(makeSummary({ totalChanges: 15 }));
    expect(reasons).toContain('High change volume (15 changes)');
  });
});

describe('rankChangelogImpacts', () => {
  it('sorts entries by impact score descending', () => {
    const entries = [
      { name: 'lodash', currentVersion: '4.0.0', latestVersion: '4.1.0', summary: makeSummary({ totalChanges: 2 }) },
      { name: 'express', currentVersion: '4.0.0', latestVersion: '5.0.0', summary: makeSummary({ hasSecurityFixes: true }) },
    ];
    const ranked = rankChangelogImpacts(entries);
    expect(ranked[0].name).toBe('express');
    expect(ranked[1].name).toBe('lodash');
  });

  it('attaches impactLabel and reasons to each entry', () => {
    const entries = [
      { name: 'pkg', currentVersion: '1.0.0', latestVersion: '2.0.0', summary: makeSummary({ hasSecurityFixes: true }) },
    ];
    const [result] = rankChangelogImpacts(entries);
    expect(result.impactLabel).toBe('critical');
    expect(result.reasons).toContain('Contains security fixes');
  });
});
