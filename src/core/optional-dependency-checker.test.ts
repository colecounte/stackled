import {
  isOptionalDep,
  checkVersionCompatibility,
  buildOptionalEntry,
  checkOptionalDependencies,
  summarizeOptional,
} from './optional-dependency-checker';
import { Dependency } from '../types';

function makeDep(name: string, version: string, optional = true): Dependency {
  return {
    name,
    version,
    metadata: { optional },
  } as unknown as Dependency;
}

describe('isOptionalDep', () => {
  it('returns true when metadata.optional is true', () => {
    expect(isOptionalDep(makeDep('pkg', '1.0.0', true))).toBe(true);
  });

  it('returns false when metadata.optional is false', () => {
    expect(isOptionalDep(makeDep('pkg', '1.0.0', false))).toBe(false);
  });
});

describe('checkVersionCompatibility', () => {
  it('returns installedVersion when it satisfies the range', () => {
    expect(checkVersionCompatibility('^1.0.0', '1.2.3')).toBe('1.2.3');
  });

  it('returns null when version does not satisfy range', () => {
    expect(checkVersionCompatibility('^2.0.0', '1.2.3')).toBeNull();
  });

  it('returns null when installedVersion is null', () => {
    expect(checkVersionCompatibility('^1.0.0', null)).toBeNull();
  });

  it('returns null for invalid range', () => {
    expect(checkVersionCompatibility('not-a-range', '1.0.0')).toBeNull();
  });
});

describe('buildOptionalEntry', () => {
  it('builds an OK entry when installed and compatible', () => {
    const entry = buildOptionalEntry(makeDep('foo', '^1.0.0'), '1.5.0');
    expect(entry.isInstalled).toBe(true);
    expect(entry.compatibleVersion).toBe('1.5.0');
    expect(entry.note).toBe('OK');
  });

  it('notes incompatibility when installed but wrong version', () => {
    const entry = buildOptionalEntry(makeDep('foo', '^2.0.0'), '1.5.0');
    expect(entry.isInstalled).toBe(true);
    expect(entry.compatibleVersion).toBeNull();
    expect(entry.note).toContain('does not satisfy');
  });

  it('notes missing when not installed', () => {
    const entry = buildOptionalEntry(makeDep('foo', '^1.0.0'), null);
    expect(entry.isInstalled).toBe(false);
    expect(entry.note).toContain('Not installed');
  });

  it('notes non-optional dep', () => {
    const entry = buildOptionalEntry(makeDep('foo', '^1.0.0', false), '1.0.0');
    expect(entry.note).toBe('Not marked optional');
  });
});

describe('checkOptionalDependencies', () => {
  it('filters to only optional deps and builds entries', () => {
    const deps = [makeDep('a', '^1.0.0', true), makeDep('b', '^2.0.0', false)];
    const installed = { a: '1.1.0', b: '2.0.0' };
    const results = checkOptionalDependencies(deps, installed);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('a');
  });
});

describe('summarizeOptional', () => {
  it('correctly counts installed, missing, and incompatible', () => {
    const entries = [
      buildOptionalEntry(makeDep('a', '^1.0.0'), '1.0.0'),
      buildOptionalEntry(makeDep('b', '^2.0.0'), null),
      buildOptionalEntry(makeDep('c', '^3.0.0'), '2.0.0'),
    ];
    const summary = summarizeOptional(entries);
    expect(summary.total).toBe(3);
    expect(summary.installed).toBe(2);
    expect(summary.missing).toBe(1);
    expect(summary.incompatible).toBe(1);
  });
});
