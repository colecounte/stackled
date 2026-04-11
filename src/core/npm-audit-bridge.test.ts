import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as child_process from 'child_process';
import {
  parseNpmAuditOutput,
  mapToVulnerabilities,
  runNpmAudit,
  NpmAuditResult,
} from './npm-audit-bridge.js';

vi.mock('child_process');

const sampleOutput = JSON.stringify({
  vulnerabilities: {
    lodash: {
      severity: 'high',
      fixAvailable: true,
      via: [
        {
          source: 1234,
          title: 'Prototype Pollution',
          severity: 'high',
          url: 'https://github.com/advisories/GHSA-abc',
          range: '<4.17.21',
        },
      ],
    },
    axios: {
      severity: 'moderate',
      fixAvailable: false,
      via: [
        {
          source: 5678,
          title: 'SSRF Vulnerability',
          severity: 'moderate',
          url: 'https://github.com/advisories/GHSA-def',
          range: '<1.6.0',
        },
      ],
    },
  },
  metadata: {
    vulnerabilities: { critical: 0, high: 1, moderate: 1, low: 0, info: 0 },
  },
});

describe('parseNpmAuditOutput', () => {
  it('parses advisories from npm audit JSON', () => {
    const result = parseNpmAuditOutput(sampleOutput);
    expect(result.advisories).toHaveLength(2);
    expect(result.advisories[0].title).toBe('Prototype Pollution');
    expect(result.advisories[0].severity).toBe('high');
    expect(result.advisories[0].fixAvailable).toBe(true);
  });

  it('returns empty result for invalid JSON', () => {
    const result = parseNpmAuditOutput('not json');
    expect(result.advisories).toHaveLength(0);
    expect(result.totalVulnerabilities).toBe(0);
  });

  it('calculates totalVulnerabilities from metadata', () => {
    const result = parseNpmAuditOutput(sampleOutput);
    expect(result.totalVulnerabilities).toBe(2);
  });

  it('handles missing vulnerabilities field gracefully', () => {
    const result = parseNpmAuditOutput(JSON.stringify({ metadata: {} }));
    expect(result.advisories).toHaveLength(0);
  });
});

describe('mapToVulnerabilities', () => {
  it('maps advisories to Vulnerability shape', () => {
    const auditResult: NpmAuditResult = parseNpmAuditOutput(sampleOutput);
    const vulns = mapToVulnerabilities(auditResult);
    expect(vulns[0].id).toBe('1234');
    expect(vulns[0].severity).toBe('high');
  });

  it('maps moderate severity correctly', () => {
    const auditResult: NpmAuditResult = parseNpmAuditOutput(sampleOutput);
    const vulns = mapToVulnerabilities(auditResult);
    expect(vulns[1].severity).toBe('medium');
  });
});

describe('runNpmAudit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses output from execSync on success', () => {
    vi.spyOn(child_process, 'execSync').mockReturnValue(Buffer.from(sampleOutput));
    const result = runNpmAudit('/fake/path');
    expect(result.advisories).toHaveLength(2);
  });

  it('handles non-zero exit by reading stdout from error', () => {
    vi.spyOn(child_process, 'execSync').mockImplementation(() => {
      const err = new Error('non-zero exit') as Error & { stdout: Buffer };
      err.stdout = Buffer.from(sampleOutput);
      throw err;
    });
    const result = runNpmAudit('/fake/path');
    expect(result.advisories).toHaveLength(2);
  });
});
