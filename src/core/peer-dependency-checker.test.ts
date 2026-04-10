import {
  checkPeerCompatibility,
  buildPeerIssue,
  checkPeerDependencies,
} from './peer-dependency-checker';
import { ParsedPackage } from '../types/index';

const mockPackages: ParsedPackage[] = [
  {
    name: 'react-router-dom',
    version: '6.11.0',
    dependencies: {},
    devDependencies: {},
    peerDependencies: { react: '>=16.8.0', 'react-dom': '>=16.8.0' },
  },
  {
    name: 'some-lib',
    version: '1.0.0',
    dependencies: {},
    devDependencies: {},
    peerDependencies: { lodash: '^4.0.0' },
  },
];

describe('checkPeerCompatibility', () => {
  it('returns true when version satisfies range', () => {
    expect(checkPeerCompatibility('>=16.8.0', '18.2.0')).toBe(true);
  });

  it('returns false when version does not satisfy range', () => {
    expect(checkPeerCompatibility('>=16.8.0', '15.0.0')).toBe(false);
  });

  it('returns false when installed version is null', () => {
    expect(checkPeerCompatibility('>=16.8.0', null)).toBe(false);
  });

  it('handles caret ranges correctly', () => {
    expect(checkPeerCompatibility('^4.0.0', '4.17.21')).toBe(true);
    expect(checkPeerCompatibility('^4.0.0', '5.0.0')).toBe(false);
  });
});

describe('buildPeerIssue', () => {
  it('marks issue as missing when installedVersion is null', () => {
    const issue = buildPeerIssue('react-router-dom', 'react', '>=16.8.0', null);
    expect(issue.missing).toBe(true);
    expect(issue.compatible).toBe(false);
    expect(issue.installed).toBeNull();
  });

  it('marks issue as incompatible when version does not satisfy', () => {
    const issue = buildPeerIssue('react-router-dom', 'react', '>=16.8.0', '15.0.0');
    expect(issue.missing).toBe(false);
    expect(issue.compatible).toBe(false);
  });

  it('marks issue as compatible when version satisfies', () => {
    const issue = buildPeerIssue('react-router-dom', 'react', '>=16.8.0', '18.2.0');
    expect(issue.compatible).toBe(true);
    expect(issue.missing).toBe(false);
  });
});

describe('checkPeerDependencies', () => {
  it('detects missing peer dependencies', () => {
    const installed = { react: '18.2.0' };
    const report = checkPeerDependencies(mockPackages, installed);
    expect(report.missingCount).toBeGreaterThan(0);
    expect(report.hasIssues).toBe(true);
  });

  it('returns no issues when all peers are satisfied', () => {
    const installed = {
      react: '18.2.0',
      'react-dom': '18.2.0',
      lodash: '4.17.21',
    };
    const report = checkPeerDependencies(mockPackages, installed);
    expect(report.hasIssues).toBe(false);
    expect(report.issues).toHaveLength(0);
  });

  it('counts incompatible peers separately from missing', () => {
    const installed = { react: '15.0.0', 'react-dom': '15.0.0', lodash: '4.17.21' };
    const report = checkPeerDependencies(mockPackages, installed);
    expect(report.incompatibleCount).toBe(2);
    expect(report.missingCount).toBe(0);
  });

  it('handles packages without peerDependencies gracefully', () => {
    const pkgs: ParsedPackage[] = [{ name: 'plain', version: '1.0.0', dependencies: {}, devDependencies: {} }];
    const report = checkPeerDependencies(pkgs, {});
    expect(report.hasIssues).toBe(false);
  });
});
