import {
  isDeprecated,
  extractDeprecationMessage,
  extractSuccessor,
  detectDeprecations,
} from './deprecation-detector';
import { DependencyInfo } from '../types';

const makeDep = (
  name: string,
  meta: Record<string, unknown>
): DependencyInfo => ({
  name,
  currentVersion: '1.0.0',
  type: 'dependencies',
  npmMetadata: meta,
});

describe('isDeprecated', () => {
  it('returns true when deprecated field is set', () => {
    expect(isDeprecated({ deprecated: 'Use foo instead' })).toBe(true);
  });

  it('returns true when description contains deprecated keyword', () => {
    expect(isDeprecated({ description: 'This package is deprecated.' })).toBe(true);
  });

  it('returns false for active packages', () => {
    expect(isDeprecated({ description: 'A useful utility library' })).toBe(false);
  });

  it('returns true when description mentions end of life', () => {
    expect(isDeprecated({ description: 'End of life — no further updates.' })).toBe(true);
  });
});

describe('extractDeprecationMessage', () => {
  it('returns the deprecated string field when present', () => {
    const msg = extractDeprecationMessage({ deprecated: 'Use bar instead.' });
    expect(msg).toBe('Use bar instead.');
  });

  it('falls back to description when deprecated is not a string', () => {
    const msg = extractDeprecationMessage({
      deprecated: true,
      description: 'Deprecated: use baz.',
    });
    expect(msg).toBe('Package is deprecated.');
  });
});

describe('extractSuccessor', () => {
  it('extracts successor package from message', () => {
    expect(extractSuccessor('Use @scope/new-pkg instead')).toBe('@scope/new-pkg');
  });

  it('returns undefined when no successor is mentioned', () => {
    expect(extractSuccessor('This package is no longer maintained.')).toBeUndefined();
  });

  it('handles moved to pattern', () => {
    expect(extractSuccessor('Moved to new-package')).toBe('new-package');
  });
});

describe('detectDeprecations', () => {
  it('returns deprecation warnings for deprecated deps', () => {
    const deps: DependencyInfo[] = [
      makeDep('old-pkg', { deprecated: 'Use new-pkg instead.' }),
      makeDep('active-pkg', { description: 'Still active.' }),
    ];
    const warnings = detectDeprecations(deps);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].packageName).toBe('old-pkg');
    expect(warnings[0].successor).toBe('new-pkg');
  });

  it('returns empty array when no deprecations found', () => {
    const deps: DependencyInfo[] = [
      makeDep('pkg-a', { description: 'Healthy package' }),
    ];
    expect(detectDeprecations(deps)).toEqual([]);
  });

  it('skips deps without npmMetadata', () => {
    const dep: DependencyInfo = {
      name: 'no-meta',
      currentVersion: '1.0.0',
      type: 'dependencies',
    };
    expect(detectDeprecations([dep])).toEqual([]);
  });
});
