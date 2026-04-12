import {
  extractScope,
  classifyPrivateRisk,
  isPublicScope,
  buildPrivatePackageEntry,
  detectPrivatePackages,
  summarizePrivatePackages,
} from './private-package-detector';
import { Dependency } from '../types';

function makeDep(name: string, version = '1.0.0'): Dependency {
  return { name, version, type: 'production' } as Dependency;
}

describe('extractScope', () => {
  it('returns scope for scoped packages', () => {
    expect(extractScope('@myorg/utils')).toBe('@myorg');
  });

  it('returns null for unscoped packages', () => {
    expect(extractScope('lodash')).toBeNull();
  });
});

describe('isPublicScope', () => {
  it('recognises known public scopes', () => {
    expect(isPublicScope('@types')).toBe(true);
    expect(isPublicScope('@babel')).toBe(true);
  });

  it('returns false for unknown scopes', () => {
    expect(isPublicScope('@mycompany')).toBe(false);
  });
});

describe('classifyPrivateRisk', () => {
  it('returns high when package is private', () => {
    expect(classifyPrivateRisk(true, null)).toBe('high');
  });

  it('returns low for unknown scoped packages', () => {
    expect(classifyPrivateRisk(false, '@myorg')).toBe('low');
  });

  it('returns none for known public scopes', () => {
    expect(classifyPrivateRisk(false, '@types')).toBe('none');
  });

  it('returns none for unscoped public packages', () => {
    expect(classifyPrivateRisk(false, null)).toBe('none');
  });
});

describe('buildPrivatePackageEntry', () => {
  it('marks private packages as high risk', () => {
    const entry = buildPrivatePackageEntry(makeDep('my-lib'), { private: true });
    expect(entry.isPrivate).toBe(true);
    expect(entry.risk).toBe('high');
    expect(entry.reason).toMatch(/private/i);
  });

  it('marks unknown scoped packages as low risk', () => {
    const entry = buildPrivatePackageEntry(makeDep('@acme/core'));
    expect(entry.risk).toBe('low');
    expect(entry.registryScope).toBe('@acme');
  });

  it('marks known scoped packages as no risk', () => {
    const entry = buildPrivatePackageEntry(makeDep('@types/node'));
    expect(entry.risk).toBe('none');
  });
});

describe('detectPrivatePackages', () => {
  it('processes all dependencies', () => {
    const deps = [makeDep('lodash'), makeDep('@acme/utils'), makeDep('internal')];
    const meta = { internal: { private: true } };
    const results = detectPrivatePackages(deps, meta);
    expect(results).toHaveLength(3);
    expect(results.find((r) => r.name === 'internal')?.isPrivate).toBe(true);
  });
});

describe('summarizePrivatePackages', () => {
  it('returns correct counts', () => {
    const deps = [
      makeDep('lodash'),
      makeDep('@acme/utils'),
      makeDep('@types/node'),
      makeDep('secret-lib'),
    ];
    const meta = { 'secret-lib': { private: true } };
    const entries = detectPrivatePackages(deps, meta);
    const summary = summarizePrivatePackages(entries);
    expect(summary.total).toBe(4);
    expect(summary.privateCount).toBe(1);
    expect(summary.scopedCount).toBe(2);
    expect(summary.highRiskCount).toBe(1);
  });
});
