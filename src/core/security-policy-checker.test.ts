import {
  checkLicensePolicy,
  checkDeprecationPolicy,
  checkUnmaintainedPolicy,
  checkSecurityPolicy,
  SecurityPolicy,
} from './security-policy-checker';
import { Dependency } from '../types';

function makeDep(overrides: Partial<Dependency & Record<string, unknown>> = {}): Dependency {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    updateType: 'none',
    ...overrides,
  } as Dependency;
}

describe('checkLicensePolicy', () => {
  it('returns null when license is allowed', () => {
    const dep = makeDep({ license: 'MIT' } as any);
    expect(checkLicensePolicy(dep, ['MIT', 'Apache-2.0'])).toBeNull();
  });

  it('returns violation when license is not allowed', () => {
    const dep = makeDep({ license: 'GPL-3.0' } as any);
    const result = checkLicensePolicy(dep, ['MIT', 'Apache-2.0']);
    expect(result).not.toBeNull();
    expect(result?.rule).toBe('license-policy');
    expect(result?.severity).toBe('error');
  });

  it('returns null when no license field', () => {
    const dep = makeDep();
    expect(checkLicensePolicy(dep, ['MIT'])).toBeNull();
  });

  it('is case-insensitive', () => {
    const dep = makeDep({ license: 'mit' } as any);
    expect(checkLicensePolicy(dep, ['MIT'])).toBeNull();
  });
});

describe('checkDeprecationPolicy', () => {
  it('returns null for non-deprecated package', () => {
    const dep = makeDep({ deprecated: false } as any);
    expect(checkDeprecationPolicy(dep)).toBeNull();
  });

  it('returns violation for deprecated package', () => {
    const dep = makeDep({ deprecated: true } as any);
    const result = checkDeprecationPolicy(dep);
    expect(result?.rule).toBe('no-deprecated');
    expect(result?.severity).toBe('error');
  });
});

describe('checkUnmaintainedPolicy', () => {
  it('returns null when package is recently published', () => {
    const recent = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const dep = makeDep({ lastPublish: recent } as any);
    expect(checkUnmaintainedPolicy(dep, 365)).toBeNull();
  });

  it('returns warning when package exceeds threshold', () => {
    const old = new Date(Date.now() - 400 * 86_400_000).toISOString();
    const dep = makeDep({ lastPublish: old } as any);
    const result = checkUnmaintainedPolicy(dep, 365);
    expect(result?.rule).toBe('no-unmaintained');
    expect(result?.severity).toBe('warning');
  });

  it('returns null when no lastPublish field', () => {
    const dep = makeDep();
    expect(checkUnmaintainedPolicy(dep, 365)).toBeNull();
  });
});

describe('checkSecurityPolicy', () => {
  const policy: SecurityPolicy = {
    allowedLicenses: ['MIT'],
    blockDeprecated: true,
    blockUnmaintained: true,
    unmaintainedThresholdDays: 365,
  };

  it('passes with compliant dependencies', () => {
    const recent = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const deps = [makeDep({ license: 'MIT', deprecated: false, lastPublish: recent } as any)];
    const result = checkSecurityPolicy(deps, policy);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails with license violation', () => {
    const deps = [makeDep({ license: 'GPL-3.0' } as any)];
    const result = checkSecurityPolicy(deps, { allowedLicenses: ['MIT'] });
    expect(result.passed).toBe(false);
    expect(result.errorCount).toBe(1);
  });

  it('counts errors and warnings separately', () => {
    const old = new Date(Date.now() - 400 * 86_400_000).toISOString();
    const deps = [
      makeDep({ license: 'GPL-3.0', lastPublish: old } as any),
    ];
    const result = checkSecurityPolicy(deps, policy);
    expect(result.errorCount).toBeGreaterThanOrEqual(1);
    expect(result.warningCount).toBeGreaterThanOrEqual(1);
  });

  it('returns passed=true when only warnings exist', () => {
    const old = new Date(Date.now() - 400 * 86_400_000).toISOString();
    const deps = [makeDep({ lastPublish: old } as any)];
    const result = checkSecurityPolicy(deps, { blockUnmaintained: true, unmaintainedThresholdDays: 365 });
    expect(result.passed).toBe(true);
    expect(result.warningCount).toBe(1);
  });
});
