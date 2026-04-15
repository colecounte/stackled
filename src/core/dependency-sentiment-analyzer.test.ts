import {
  classifySentiment,
  calcSentimentScore,
  buildSentimentSignals,
  buildSentimentEntry,
  analyzeSentiment,
  summarizeSentiment,
} from './dependency-sentiment-analyzer';
import { PackageInfo } from '../types';

function makePkg(overrides: Partial<PackageInfo> = {}): PackageInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    weeklyDownloads: 50_000,
    openIssues: 10,
    deprecated: false,
    daysSinceLastPublish: 30,
    stars: 500,
    contributors: 5,
    ...overrides,
  } as PackageInfo;
}

describe('classifySentiment', () => {
  it('returns positive for score >= 70', () => expect(classifySentiment(75)).toBe('positive'));
  it('returns neutral for score 40-69', () => expect(classifySentiment(55)).toBe('neutral'));
  it('returns negative for score 15-39', () => expect(classifySentiment(25)).toBe('negative'));
  it('returns critical for score < 15', () => expect(classifySentiment(5)).toBe('critical'));
});

describe('buildSentimentSignals', () => {
  it('flags high download volume', () => {
    const signals = buildSentimentSignals(makePkg({ weeklyDownloads: 600_000 }));
    expect(signals).toContain('high download volume');
  });

  it('flags deprecated packages', () => {
    const signals = buildSentimentSignals(makePkg({ deprecated: true }));
    expect(signals).toContain('package is deprecated');
  });

  it('flags single maintainer risk', () => {
    const signals = buildSentimentSignals(makePkg({ contributors: 1 }));
    expect(signals).toContain('single maintainer risk');
  });

  it('returns empty signals for healthy package', () => {
    const signals = buildSentimentSignals(makePkg());
    expect(signals).toHaveLength(0);
  });
});

describe('calcSentimentScore', () => {
  it('boosts score for high downloads', () => {
    const score = calcSentimentScore(makePkg({ weeklyDownloads: 2_000_000 }));
    expect(score).toBeGreaterThan(60);
  });

  it('penalizes deprecated packages heavily', () => {
    const score = calcSentimentScore(makePkg({ deprecated: true }));
    expect(score).toBeLessThan(20);
  });

  it('penalizes stale packages', () => {
    const score = calcSentimentScore(makePkg({ daysSinceLastPublish: 400 }));
    expect(score).toBeLessThan(50);
  });

  it('clamps score between 0 and 100', () => {
    const score = calcSentimentScore(makePkg({ deprecated: true, daysSinceLastPublish: 800, weeklyDownloads: 0 }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('buildSentimentEntry', () => {
  it('returns a valid entry', () => {
    const entry = buildSentimentEntry(makePkg());
    expect(entry.name).toBe('test-pkg');
    expect(entry.score).toBeGreaterThanOrEqual(0);
    expect(['positive', 'neutral', 'negative', 'critical']).toContain(entry.level);
  });
});

describe('analyzeSentiment', () => {
  it('returns one entry per package', () => {
    const pkgs = [makePkg({ name: 'a' }), makePkg({ name: 'b' })];
    expect(analyzeSentiment(pkgs)).toHaveLength(2);
  });
});

describe('summarizeSentiment', () => {
  it('counts levels correctly', () => {
    const entries = [
      { ...buildSentimentEntry(makePkg({ weeklyDownloads: 2_000_000, stars: 5000 })) },
      { ...buildSentimentEntry(makePkg({ deprecated: true })) },
    ];
    const summary = summarizeSentiment(entries);
    expect(summary.total).toBe(2);
    expect(summary.positive + summary.neutral + summary.negative + summary.critical).toBe(2);
  });

  it('returns zero averageScore for empty list', () => {
    expect(summarizeSentiment([]).averageScore).toBe(0);
  });
});
