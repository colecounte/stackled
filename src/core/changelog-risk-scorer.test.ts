import { describe, it, expect } from 'vitest';
import {
  gradeFromRiskScore,
  calcRiskScore,
  scoreChangelogRisks,
} from './changelog-risk-scorer';
import { ChangelogSummary } from '../types';

function makeSummary(overrides: Partial<ChangelogSummary> = {}): ChangelogSummary {
  return {
    hasBreakingChanges: false,
    hasSecurityFixes: false,
    hasDeprecationNotices: false,
    totalChanges: 0,
    highlights: [],
    ...overrides,
  };
}

describe('gradeFromRiskScore', () => {
  it('returns A for score <= 10', () => expect(gradeFromRiskScore(0)).toBe('A'));
  it('returns B for score <= 25', () => expect(gradeFromRiskScore(20)).toBe('B'));
  it('returns C for score <= 45', () => expect(gradeFromRiskScore(35)).toBe('C'));
  it('returns D for score <= 65', () => expect(gradeFromRiskScore(55)).toBe('D'));
  it('returns F for score > 65', () => expect(gradeFromRiskScore(80)).toBe('F'));
});

describe('calcRiskScore', () => {
  it('returns 0 score with no risk factors', () => {
    const { score, factors } = calcRiskScore(makeSummary());
    expect(score).toBe(0);
    expect(factors).toHaveLength(0);
  });

  it('adds 40 for breaking changes', () => {
    const { score, factors } = calcRiskScore(makeSummary({ hasBreakingChanges: true }));
    expect(score).toBe(40);
    expect(factors).toContain('Breaking changes detected');
  });

  it('adds 30 for security fixes', () => {
    const { score, factors } = calcRiskScore(makeSummary({ hasSecurityFixes: true }));
    expect(score).toBe(30);
    expect(factors).toContain('Security fixes present');
  });

  it('adds 15 for deprecation notices', () => {
    const { score, factors } = calcRiskScore(makeSummary({ hasDeprecationNotices: true }));
    expect(score).toBe(15);
    expect(factors).toContain('Deprecation notices found');
  });

  it('adds 15 for >50 total changes', () => {
    const { score, factors } = calcRiskScore(makeSummary({ totalChanges: 60 }));
    expect(score).toBe(15);
    expect(factors).toContain('High volume of changes (>50)');
  });

  it('adds 8 for >20 total changes', () => {
    const { score } = calcRiskScore(makeSummary({ totalChanges: 30 }));
    expect(score).toBe(8);
  });

  it('caps score at 100', () => {
    const { score } = calcRiskScore(
      makeSummary({ hasBreakingChanges: true, hasSecurityFixes: true, totalChanges: 60 })
    );
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('scoreChangelogRisks', () => {
  it('returns sorted results by score descending', () => {
    const entries = [
      { package: 'lodash', version: '5.0.0', summary: makeSummary({ hasDeprecationNotices: true }) },
      { package: 'react', version: '19.0.0', summary: makeSummary({ hasBreakingChanges: true }) },
      { package: 'chalk', version: '6.0.0', summary: makeSummary() },
    ];
    const results = scoreChangelogRisks(entries);
    expect(results[0].package).toBe('react');
    expect(results[1].package).toBe('lodash');
    expect(results[2].package).toBe('chalk');
  });

  it('assigns correct grade to each entry', () => {
    const entries = [
      { package: 'pkg-a', version: '1.0.0', summary: makeSummary({ hasBreakingChanges: true, hasSecurityFixes: true }) },
    ];
    const [result] = scoreChangelogRisks(entries);
    expect(result.grade).toBe('F');
    expect(result.factors.length).toBeGreaterThan(0);
  });
});
