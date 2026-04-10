import { suggestStrategy, buildPinRecommendation, recommendPins } from './pin-recommender';
import { DependencyInfo } from '../types/index';

function makeDep(overrides: Partial<DependencyInfo> = {}): DependencyInfo {
  return {
    name: 'my-lib',
    current: '2.3.1',
    latest: '2.4.0',
    latestStable: '2.4.0',
    updateType: 'minor',
    hasBreakingChanges: false,
    vulnerabilities: [],
    ...overrides,
  } as DependencyInfo;
}

describe('suggestStrategy', () => {
  it('returns minor for normal deps', () => {
    expect(suggestStrategy(makeDep())).toBe('minor');
  });

  it('returns exact when vulnerabilities exist', () => {
    const dep = makeDep({ vulnerabilities: [{ id: 'CVE-001' }] as any });
    expect(suggestStrategy(dep)).toBe('exact');
  });

  it('returns patch when breaking changes detected', () => {
    const dep = makeDep({ hasBreakingChanges: true });
    expect(suggestStrategy(dep)).toBe('patch');
  });

  it('returns minor for major version jump without breaking flag', () => {
    const dep = makeDep({ current: '1.0.0', latestStable: '3.0.0' });
    expect(suggestStrategy(dep)).toBe('minor');
  });

  it('returns none when current is missing', () => {
    const dep = makeDep({ current: '', latestStable: '' });
    expect(suggestStrategy(dep)).toBe('none');
  });
});

describe('buildPinRecommendation', () => {
  it('returns caret range for minor strategy', () => {
    const rec = buildPinRecommendation(makeDep());
    expect(rec.recommended).toBe('^2.3.1');
    expect(rec.strategy).toBe('minor');
  });

  it('returns tilde range for patch strategy', () => {
    const rec = buildPinRecommendation(makeDep({ hasBreakingChanges: true }));
    expect(rec.recommended).toBe('~2.3.1');
    expect(rec.strategy).toBe('patch');
  });

  it('returns exact version for exact strategy', () => {
    const rec = buildPinRecommendation(makeDep({ vulnerabilities: [{ id: 'x' }] as any }));
    expect(rec.recommended).toBe('2.3.1');
    expect(rec.strategy).toBe('exact');
  });

  it('includes reason text', () => {
    const rec = buildPinRecommendation(makeDep());
    expect(rec.reason).toMatch(/minor/i);
  });
});

describe('recommendPins', () => {
  it('returns a recommendation per dependency', () => {
    const deps = [makeDep({ name: 'a' }), makeDep({ name: 'b' })];
    const recs = recommendPins(deps);
    expect(recs).toHaveLength(2);
    expect(recs.map(r => r.name)).toEqual(['a', 'b']);
  });
});
