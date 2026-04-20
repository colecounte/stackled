import {
  classifySignatureRisk,
  buildSignatureFlags,
  buildSignatureEntry,
  verifySignatures,
  summarizeSignatures,
} from './dependency-signature-verifier';
import { PackageInfo } from '../types';

function makeDep(name: string, version = '1.0.0'): PackageInfo {
  return { name, version, currentVersion: version, latestVersion: version } as PackageInfo;
}

function makeMeta(opts: {
  signatures?: unknown[];
  integrity?: string;
  provenance?: unknown;
}): Record<string, unknown> {
  return {
    dist: {
      signatures: opts.signatures ?? [],
      integrity: opts.integrity ?? '',
    },
    provenance: opts.provenance ?? null,
  };
}

describe('classifySignatureRisk', () => {
  it('returns high for invalid status', () => {
    expect(classifySignatureRisk('invalid', true)).toBe('high');
  });

  it('returns high for missing status without provenance', () => {
    expect(classifySignatureRisk('missing', false)).toBe('high');
  });

  it('returns medium for missing status with provenance', () => {
    expect(classifySignatureRisk('missing', true)).toBe('medium');
  });

  it('returns medium for unverified', () => {
    expect(classifySignatureRisk('unverified', true)).toBe('medium');
  });

  it('returns low for verified', () => {
    expect(classifySignatureRisk('verified', true)).toBe('low');
  });
});

describe('buildSignatureFlags', () => {
  it('adds invalid-signature flag for invalid status', () => {
    expect(buildSignatureFlags('invalid', true, true)).toContain('invalid-signature');
  });

  it('adds no-signature flag for missing status', () => {
    expect(buildSignatureFlags('missing', true, true)).toContain('no-signature');
  });

  it('adds no-provenance when provenance absent', () => {
    expect(buildSignatureFlags('verified', false, true)).toContain('no-provenance');
  });

  it('adds no-sigstore when sigstore absent', () => {
    expect(buildSignatureFlags('verified', true, false)).toContain('no-sigstore');
  });

  it('returns empty flags for fully verified package', () => {
    expect(buildSignatureFlags('verified', true, true)).toHaveLength(0);
  });
});

describe('buildSignatureEntry', () => {
  it('marks verified when signatures and integrity present', () => {
    const meta = makeMeta({
      signatures: [{ keyid: 'sigstore-abc', sig: 'xyz' }],
      integrity: 'sha512-abc',
      provenance: { transparency: true },
    });
    const entry = buildSignatureEntry(makeDep('react'), meta);
    expect(entry.status).toBe('verified');
    expect(entry.hasSigstore).toBe(true);
    expect(entry.hasProvenance).toBe(true);
    expect(entry.riskLevel).toBe('low');
  });

  it('marks unverified when only integrity present', () => {
    const meta = makeMeta({ integrity: 'sha512-abc' });
    const entry = buildSignatureEntry(makeDep('lodash'), meta);
    expect(entry.status).toBe('unverified');
    expect(entry.riskLevel).toBe('medium');
  });

  it('marks missing when no signatures or integrity', () => {
    const meta = makeMeta({});
    const entry = buildSignatureEntry(makeDep('left-pad'), meta);
    expect(entry.status).toBe('missing');
    expect(entry.riskLevel).toBe('high');
  });
});

describe('summarizeSignatures', () => {
  it('counts entries correctly', () => {
    const pkgs = [makeDep('a'), makeDep('b'), makeDep('c')];
    const metas: Record<string, Record<string, unknown>> = {
      a: makeMeta({ signatures: [{ keyid: 'sigstore-x', sig: 's' }], integrity: 'sha512-a', provenance: {} }),
      b: makeMeta({ integrity: 'sha512-b' }),
      c: makeMeta({}),
    };
    const entries = verifySignatures(pkgs, metas);
    const summary = summarizeSignatures(entries);
    expect(summary.total).toBe(3);
    expect(summary.verified).toBe(1);
    expect(summary.unverified).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.highRisk).toBe(1);
  });
});
