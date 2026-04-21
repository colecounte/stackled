import {
  classifyBreakingRisk,
  extractAffectedApis,
  buildBreakingChangeEntry,
  trackBreakingChanges,
  summarizeBreakingChanges,
} from './dependency-breaking-change-tracker';
import type { PackageInfo, BreakingChange } from '../types';

function makePkg(name: string, version: string): PackageInfo {
  return { name, version, description: '', license: 'MIT' } as PackageInfo;
}

function makeChange(
  severity: BreakingChange['severity'],
  symbol?: string,
  migrationNote?: string
): BreakingChange {
  return {
    description: `Breaking: ${severity}`,
    severity,
    affectedSymbols: symbol ? [symbol] : [],
    migrationNote: migrationNote ?? null,
  } as unknown as BreakingChange;
}

describe('classifyBreakingRisk', () => {
  it('returns critical when any change is critical', () => {
    expect(classifyBreakingRisk([makeChange('critical')])).toBe('critical');
  });

  it('returns high when any change is high', () => {
    expect(classifyBreakingRisk([makeChange('high')])).toBe('high');
  });

  it('returns medium for more than 3 low changes', () => {
    const changes = Array.from({ length: 4 }, () => makeChange('low'));
    expect(classifyBreakingRisk(changes)).toBe('medium');
  });

  it('returns low for a single low change', () => {
    expect(classifyBreakingRisk([makeChange('low')])).toBe('low');
  });
});

describe('extractAffectedApis', () => {
  it('deduplicates symbols', () => {
    const changes = [makeChange('low', 'foo'), makeChange('low', 'foo'), makeChange('low', 'bar')];
    expect(extractAffectedApis(changes)).toEqual(['foo', 'bar']);
  });

  it('limits to 10 symbols', () => {
    const changes = Array.from({ length: 15 }, (_, i) => makeChange('low', `sym${i}`));
    expect(extractAffectedApis(changes)).toHaveLength(10);
  });
});

describe('buildBreakingChangeEntry', () => {
  it('builds entry with migration note from first change that has one', () => {
    const pkg = makePkg('react', '18.0.0');
    const changes = [makeChange('high', 'render', 'Use createRoot instead')];
    const entry = buildBreakingChangeEntry(pkg, '17.0.0', changes);
    expect(entry.migrationNotes).toBe('Use createRoot instead');
    expect(entry.fromVersion).toBe('17.0.0');
    expect(entry.toVersion).toBe('18.0.0');
  });
});

describe('trackBreakingChanges', () => {
  it('only includes packages with newer versions', () => {
    const pkgs = [makePkg('lodash', '4.18.0'), makePkg('axios', '1.0.0')];
    const prev = { lodash: '4.17.0', axios: '1.0.0' };
    const changeMap = { lodash: [makeChange('low')] };
    const result = trackBreakingChanges(pkgs, prev, changeMap);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('lodash');
  });

  it('returns empty array when no upgrades exist', () => {
    const pkgs = [makePkg('lodash', '4.17.0')];
    const prev = { lodash: '4.17.0' };
    expect(trackBreakingChanges(pkgs, prev, {})).toHaveLength(0);
  });
});

describe('summarizeBreakingChanges', () => {
  it('aggregates counts correctly', () => {
    const entries = [
      buildBreakingChangeEntry(makePkg('a', '2.0.0'), '1.0.0', [makeChange('critical')]),
      buildBreakingChangeEntry(makePkg('b', '2.0.0'), '1.0.0', [makeChange('high'), makeChange('low')]),
    ];
    const summary = summarizeBreakingChanges(entries);
    expect(summary.total).toBe(3);
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.packagesAffected).toBe(2);
  });
});
