import { Dependency } from '../types';

export interface SecurityPolicy {
  allowedLicenses?: string[];
  maxCriticalVulnerabilities?: number;
  maxHighVulnerabilities?: number;
  blockDeprecated?: boolean;
  blockUnmaintained?: boolean;
  unmaintainedThresholdDays?: number;
}

export interface PolicyViolation {
  package: string;
  version: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface PolicyCheckResult {
  passed: boolean;
  violations: PolicyViolation[];
  errorCount: number;
  warningCount: number;
}

export function checkLicensePolicy(
  dep: Dependency,
  allowedLicenses: string[]
): PolicyViolation | null {
  const license = (dep as any).license as string | undefined;
  if (!license) return null;
  const normalized = license.toUpperCase();
  const allowed = allowedLicenses.map((l) => l.toUpperCase());
  if (!allowed.includes(normalized)) {
    return {
      package: dep.name,
      version: dep.version,
      rule: 'license-policy',
      severity: 'error',
      message: `License "${license}" is not in the allowed list: ${allowedLicenses.join(', ')}`,
    };
  }
  return null;
}

export function checkDeprecationPolicy(
  dep: Dependency
): PolicyViolation | null {
  if ((dep as any).deprecated) {
    return {
      package: dep.name,
      version: dep.version,
      rule: 'no-deprecated',
      severity: 'error',
      message: `Package "${dep.name}" is deprecated`,
    };
  }
  return null;
}

export function checkUnmaintainedPolicy(
  dep: Dependency,
  thresholdDays: number
): PolicyViolation | null {
  const lastPublish = (dep as any).lastPublish as string | undefined;
  if (!lastPublish) return null;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastPublish).getTime()) / 86_400_000
  );
  if (daysSince > thresholdDays) {
    return {
      package: dep.name,
      version: dep.version,
      rule: 'no-unmaintained',
      severity: 'warning',
      message: `Package "${dep.name}" has not been published in ${daysSince} days (threshold: ${thresholdDays})`,
    };
  }
  return null;
}

export function checkSecurityPolicy(
  deps: Dependency[],
  policy: SecurityPolicy
): PolicyCheckResult {
  const violations: PolicyViolation[] = [];

  for (const dep of deps) {
    if (policy.allowedLicenses) {
      const v = checkLicensePolicy(dep, policy.allowedLicenses);
      if (v) violations.push(v);
    }
    if (policy.blockDeprecated) {
      const v = checkDeprecationPolicy(dep);
      if (v) violations.push(v);
    }
    if (policy.blockUnmaintained) {
      const threshold = policy.unmaintainedThresholdDays ?? 365;
      const v = checkUnmaintainedPolicy(dep, threshold);
      if (v) violations.push(v);
    }
  }

  const errorCount = violations.filter((v) => v.severity === 'error').length;
  const warningCount = violations.filter((v) => v.severity === 'warning').length;

  return { passed: errorCount === 0, violations, errorCount, warningCount };
}
