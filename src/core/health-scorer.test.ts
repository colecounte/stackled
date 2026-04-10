import {
  gradeFromScore,
  scoreMaintenance,
  scoreSecurity,
  scoreFreshness,
  scorePopularity,
  computeHealthScore,
  HealthScore,
} from './health-scorer';
import { MaintainerStatus, VulnerabilitySummary, OutdatedEntry } from '../types';

const makeMaintainer = (days: number, abandoned = false): MaintainerStatus => ({
  package: 'test',
  lastPublish: new Date().toISOString(),
  daysSinceLastPublish: days,
  isAbandoned: abandoned,
  maintainerCount: 1,
});

const makeVulns = (critical = 0, high = 0, moderate = 0, low = 0): VulnerabilitySummary => ({
  critical, high, moderate, low, total: critical + high + moderate + low,
});

const makeOutdated = (type: 'major' | 'minor' | 'patch'): OutdatedEntry => ({
  package: 'test', current: '1.0.0', latest: '2.0.0', updateType: type,
});

describe('gradeFromScore', () => {
  it('returns A for score >= 90', () => expect(gradeFromScore(95)).toBe('A'));
  it('returns B for score 75-89', () => expect(gradeFromScore(80)).toBe('B'));
  it('returns C for score 55-74', () => expect(gradeFromScore(60)).toBe('C'));
  it('returns D for score 35-54', () => expect(gradeFromScore(40)).toBe('D'));
  it('returns F for score < 35', () => expect(gradeFromScore(20)).toBe('F'));
});

describe('scoreMaintenance', () => {
  it('returns 0 for abandoned packages', () => {
    expect(scoreMaintenance(makeMaintainer(0, true))).toBe(0);
  });
  it('returns 100 for recently published', () => {
    expect(scoreMaintenance(makeMaintainer(30))).toBe(100);
  });
  it('returns 20 for very stale packages', () => {
    expect(scoreMaintenance(makeMaintainer(800))).toBe(20);
  });
});

describe('scoreSecurity', () => {
  it('returns 0 for critical vulnerabilities', () => {
    expect(scoreSecurity(makeVulns(1))).toBe(0);
  });
  it('returns 100 for no vulnerabilities', () => {
    expect(scoreSecurity(makeVulns())).toBe(100);
  });
  it('returns 60 for moderate vulnerabilities', () => {
    expect(scoreSecurity(makeVulns(0, 0, 2))).toBe(60);
  });
});

describe('scoreFreshness', () => {
  it('returns 100 when not outdated', () => expect(scoreFreshness(null)).toBe(100));
  it('returns 40 for major update available', () => expect(scoreFreshness(makeOutdated('major'))).toBe(40));
  it('returns 90 for patch update available', () => expect(scoreFreshness(makeOutdated('patch'))).toBe(90));
});

describe('scorePopularity', () => {
  it('returns 100 for 1M+ weekly downloads', () => expect(scorePopularity(2_000_000)).toBe(100));
  it('returns 25 for low download count', () => expect(scorePopularity(500)).toBe(25));
});

describe('computeHealthScore', () => {
  it('computes a weighted score and grade', () => {
    const result: HealthScore = computeHealthScore(
      'lodash',
      makeMaintainer(30),
      makeVulns(),
      null,
      5_000_000
    );
    expect(result.package).toBe('lodash');
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe('A');
    expect(result.breakdown).toHaveProperty('maintenance');
  });

  it('gives low score for abandoned + critical vuln package', () => {
    const result = computeHealthScore(
      'bad-pkg',
      makeMaintainer(1000, true),
      makeVulns(2),
      makeOutdated('major'),
      100
    );
    expect(result.score).toBeLessThan(35);
    expect(result.grade).toBe('F');
  });
});
