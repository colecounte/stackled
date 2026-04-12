import {
  classifyVersionType,
  calcDaysAgo,
  buildTimelineEntry,
  buildChangelogTimeline,
} from './changelog-timeline';
import { PackageInfo } from '../types';

function makePkg(
  name: string,
  time: Record<string, string>
): PackageInfo {
  return { name, version: '1.0.0', time } as unknown as PackageInfo;
}

describe('classifyVersionType', () => {
  it('identifies major releases', () => {
    expect(classifyVersionType('2.0.0')).toBe('major');
    expect(classifyVersionType('10.0.0')).toBe('major');
  });

  it('identifies minor releases', () => {
    expect(classifyVersionType('1.2.0')).toBe('minor');
    expect(classifyVersionType('0.3.0')).toBe('minor');
  });

  it('identifies patch releases', () => {
    expect(classifyVersionType('1.0.1')).toBe('patch');
  });

  it('returns unknown for malformed versions', () => {
    expect(classifyVersionType('1')).toBe('unknown');
    expect(classifyVersionType('')).toBe('unknown');
  });
});

describe('calcDaysAgo', () => {
  it('returns a non-negative number for a past date', () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(calcDaysAgo(past)).toBeGreaterThanOrEqual(4);
  });

  it('returns -1 for invalid dates', () => {
    expect(calcDaysAgo('not-a-date')).toBe(-1);
  });
});

describe('buildTimelineEntry', () => {
  it('builds a valid entry', () => {
    const pkg = makePkg('react', {});
    const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const entry = buildTimelineEntry(pkg, '18.0.0', date);
    expect(entry.name).toBe('react');
    expect(entry.version).toBe('18.0.0');
    expect(entry.type).toBe('major');
    expect(entry.daysAgo).toBeGreaterThanOrEqual(9);
  });
});

describe('buildChangelogTimeline', () => {
  it('builds a timeline from packages', () => {
    const d1 = new Date(Date.now() - 5 * 86400000).toISOString();
    const d2 = new Date(Date.now() - 20 * 86400000).toISOString();
    const d3 = new Date(Date.now() - 2 * 86400000).toISOString();
    const pkgs = [
      makePkg('react', { '18.0.0': d1, '17.0.0': d2, created: d2 }),
      makePkg('lodash', { '4.17.21': d3 }),
    ];
    const timeline = buildChangelogTimeline(pkgs);
    expect(timeline.totalReleases).toBe(3);
    expect(timeline.entries[0].daysAgo).toBeLessThanOrEqual(3);
    expect(timeline.mostActivePackage).toBe('react');
    expect(timeline.spanDays).toBeGreaterThan(0);
  });

  it('handles packages with no time field', () => {
    const pkg = { name: 'empty', version: '1.0.0' } as unknown as PackageInfo;
    const timeline = buildChangelogTimeline([pkg]);
    expect(timeline.totalReleases).toBe(0);
    expect(timeline.mostActivePackage).toBeNull();
  });

  it('excludes created and modified meta keys', () => {
    const d = new Date().toISOString();
    const pkg = makePkg('meta-pkg', { created: d, modified: d, '1.0.0': d });
    const timeline = buildChangelogTimeline([pkg]);
    expect(timeline.totalReleases).toBe(1);
  });
});
