import { printAuditReport } from './audit-command';
import { VulnerabilityReport } from '../types';
import { ScanResult } from '../core/vulnerability-scanner';

const makeReport = (overrides: Partial<VulnerabilityReport> = {}): VulnerabilityReport => ({
  totalPackagesScanned: 5,
  vulnerablePackages: 0,
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  results: [],
  ...overrides,
});

/** Helper to capture and join all console.log output from a printAuditReport call. */
const captureOutput = (report: VulnerabilityReport, format: 'table' | 'json'): string => {
  printAuditReport(report, format);
  return consoleSpy.mock.calls.flat().join(' ');
};

describe('printAuditReport', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  it('prints clean message when no vulnerabilities', () => {
    const output = captureOutput(makeReport(), 'table');
    expect(output).toMatch(/No vulnerabilities found/);
  });

  it('outputs JSON when format is json', () => {
    const report = makeReport();
    printAuditReport(report, 'json');
    const raw = consoleSpy.mock.calls[0][0];
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(JSON.parse(raw).totalPackagesScanned).toBe(5);
  });

  it('prints vulnerable package details', () => {
    const results: ScanResult[] = [
      {
        packageName: 'lodash',
        version: '4.17.15',
        hasVulnerabilities: true,
        vulnerabilities: [
          {
            id: 'GHSA-abc',
            title: 'Prototype Pollution',
            severity: 'high',
            packageName: 'lodash',
            affectedVersions: '<4.17.21',
            patchedVersion: '4.17.21',
          },
        ],
      },
    ];
    const report = makeReport({ vulnerablePackages: 1, highCount: 1, results });
    const output = captureOutput(report, 'table');
    expect(output).toMatch(/lodash/);
    expect(output).toMatch(/Prototype Pollution/);
    expect(output).toMatch(/4.17.21/);
  });
});
