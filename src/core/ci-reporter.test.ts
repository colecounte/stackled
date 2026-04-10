import {
  evaluateThresholds,
  formatCiOutput,
  CiThresholds,
} from './ci-reporter';
import { HealthScore } from '../types';

function makeScore(overall: number): HealthScore {
  return {
    packageName: 'pkg',
    overall,
    maintenance: overall,
    security: overall,
    freshness: overall,
    popularity: overall,
    grade: 'B',
  };
}

describe('evaluateThresholds', () => {
  it('passes when all metrics are within thresholds', () => {
    const result = evaluateThresholds([makeScore(80)], 0, 2, 0, 3);
    expect(result.passed).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.failureReasons).toHaveLength(0);
  });

  it('fails when average health score is below threshold', () => {
    const result = evaluateThresholds([makeScore(30)], 0, 0, 0, 0);
    expect(result.passed).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.failureReasons[0]).toMatch(/health score/);
  });

  it('fails when critical vulnerabilities exceed threshold', () => {
    const result = evaluateThresholds([makeScore(80)], 1, 0, 0, 0);
    expect(result.passed).toBe(false);
    expect(result.failureReasons[0]).toMatch(/critical vulnerabilities/);
  });

  it('fails when high vulnerabilities exceed custom threshold', () => {
    const thresholds: CiThresholds = { maxHighVulnerabilities: 2 };
    const result = evaluateThresholds([makeScore(80)], 0, 3, 0, 0, thresholds);
    expect(result.passed).toBe(false);
    expect(result.failureReasons[0]).toMatch(/high vulnerabilities/);
  });

  it('fails when deprecated packages are present and not allowed', () => {
    const result = evaluateThresholds([makeScore(80)], 0, 0, 2, 0);
    expect(result.passed).toBe(false);
    expect(result.failureReasons[0]).toMatch(/deprecated/);
  });

  it('passes when deprecated packages are present but allowed', () => {
    const thresholds: CiThresholds = { allowDeprecated: true };
    const result = evaluateThresholds([makeScore(80)], 0, 0, 2, 0, thresholds);
    expect(result.passed).toBe(true);
  });

  it('fails when outdated direct dependencies exceed threshold', () => {
    const result = evaluateThresholds([makeScore(80)], 0, 0, 0, 15);
    expect(result.passed).toBe(false);
    expect(result.failureReasons[0]).toMatch(/outdated direct/);
  });

  it('accumulates multiple failure reasons', () => {
    const result = evaluateThresholds([makeScore(20)], 2, 10, 3, 20);
    expect(result.failureReasons.length).toBeGreaterThan(1);
  });

  it('handles empty scores array gracefully', () => {
    const result = evaluateThresholds([], 0, 0, 0, 0);
    expect(result.passed).toBe(true);
  });
});

describe('formatCiOutput', () => {
  it('formats a passing report with checkmark', () => {
    const report = evaluateThresholds([makeScore(80)], 0, 0, 0, 0);
    const output = formatCiOutput(report);
    expect(output).toMatch(/✅/);
  });

  it('formats a failing report with X and bullet reasons', () => {
    const report = evaluateThresholds([makeScore(20)], 2, 0, 0, 0);
    const output = formatCiOutput(report);
    expect(output).toMatch(/❌/);
    expect(output).toMatch(/•/);
  });
});
