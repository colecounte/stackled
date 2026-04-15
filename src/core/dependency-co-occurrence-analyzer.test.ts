import {
  isRiskyCombo,
  extractCommonVersionPattern,
  buildCoOccurrenceEntries,
  analyzeCoOccurrences,
} from './dependency-co-occurrence-analyzer';
import { ParsedDependency } from '../types';

function makeDep(
  name: string,
  currentVersion = '1.0.0'
): ParsedDependency {
  return {
    name,
    currentVersion,
    specifiedVersion: `^${currentVersion}`,
    type: 'dependency',
  };
}

describe('isRiskyCombo', () => {
  it('flags known risky pairs', () => {
    expect(isRiskyCombo('lodash', 'lodash-es')).toBe(true);
    expect(isRiskyCombo('moment', 'dayjs')).toBe(true);
  });

  it('flags reversed risky pairs', () => {
    expect(isRiskyCombo('dayjs', 'moment')).toBe(true);
    expect(isRiskyCombo('lodash-es', 'lodash')).toBe(true);
  });

  it('returns false for safe combos', () => {
    expect(isRiskyCombo('react', 'vue')).toBe(false);
    expect(isRiskyCombo('express', 'fastify')).toBe(false);
  });
});

describe('extractCommonVersionPattern', () => {
  it('returns pattern when major versions match', () => {
    expect(extractCommonVersionPattern('1.2.3', '1.5.0')).toBe('^1.x');
  });

  it('returns null when major versions differ', () => {
    expect(extractCommonVersionPattern('1.0.0', '2.0.0')).toBeNull();
  });

  it('handles pre-release versions', () => {
    expect(extractCommonVersionPattern('3.0.0-beta.1', '3.1.0')).toBe('^3.x');
  });
});

describe('buildCoOccurrenceEntries', () => {
  it('creates entries for all pairs', () => {
    const deps = [makeDep('a'), makeDep('b'), makeDep('c')];
    const entries = buildCoOccurrenceEntries(deps);
    expect(entries).toHaveLength(3); // (a,b), (a,c), (b,c)
  });

  it('flags risky combos', () => {
    const deps = [makeDep('moment', '2.29.0'), makeDep('dayjs', '1.11.0')];
    const entries = buildCoOccurrenceEntries(deps);
    expect(entries[0].riskFlag).toBe(true);
  });

  it('returns empty for single dep', () => {
    const entries = buildCoOccurrenceEntries([makeDep('solo')]);
    expect(entries).toHaveLength(0);
  });
});

describe('analyzeCoOccurrences', () => {
  it('returns summary with correct counts', () => {
    const deps = [
      makeDep('lodash', '4.17.21'),
      makeDep('lodash-es', '4.17.21'),
      makeDep('react', '18.0.0'),
    ];
    const { entries, summary } = analyzeCoOccurrences(deps);
    expect(entries).toHaveLength(3);
    expect(summary.flagged).toBe(1);
    expect(summary.total).toBe(3);
  });

  it('returns empty summary for no deps', () => {
    const { entries, summary } = analyzeCoOccurrences([]);
    expect(entries).toHaveLength(0);
    expect(summary.total).toBe(0);
    expect(summary.flagged).toBe(0);
  });
});
