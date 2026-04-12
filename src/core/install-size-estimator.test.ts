import {
  formatBytes,
  classifyInstallFlag,
  buildInstallSizeEntry,
  summarizeInstallSizes,
  InstallSizeEntry,
} from './install-size-estimator';
import { PackageInfo } from '../types';

function makePkg(name: string, version = '1.0.0'): PackageInfo {
  return { name, version } as PackageInfo;
}

describe('formatBytes', () => {
  it('formats bytes below 1 kB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(12_300)).toBe('12.3 kB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(3_500_000)).toBe('3.50 MB');
  });
});

describe('classifyInstallFlag', () => {
  it('returns ok for small packages', () => {
    expect(classifyInstallFlag(100_000)).toBe('ok');
  });

  it('returns warn for packages above 500 kB', () => {
    expect(classifyInstallFlag(600_000)).toBe('warn');
  });

  it('returns danger for packages above 5 MB', () => {
    expect(classifyInstallFlag(6_000_000)).toBe('danger');
  });

  it('returns warn at exactly 500 kB threshold', () => {
    expect(classifyInstallFlag(500_000)).toBe('warn');
  });
});

describe('buildInstallSizeEntry', () => {
  it('builds a complete entry with formatted sizes', () => {
    const entry = buildInstallSizeEntry(makePkg('lodash', '4.17.21'), 75_000, 450_000, 312);
    expect(entry.name).toBe('lodash');
    expect(entry.version).toBe('4.17.21');
    expect(entry.publishSize).toBe(75_000);
    expect(entry.installSize).toBe(450_000);
    expect(entry.fileCount).toBe(312);
    expect(entry.formattedPublish).toBe('75.0 kB');
    expect(entry.formattedInstall).toBe('450.0 kB');
    expect(entry.flag).toBe('ok');
  });

  it('assigns danger flag for large install size', () => {
    const entry = buildInstallSizeEntry(makePkg('heavy-lib'), 200_000, 8_000_000, 1200);
    expect(entry.flag).toBe('danger');
  });
});

describe('summarizeInstallSizes', () => {
  const entries: InstallSizeEntry[] = [
    buildInstallSizeEntry(makePkg('a'), 10_000, 100_000, 10),
    buildInstallSizeEntry(makePkg('b'), 50_000, 700_000, 50),
    buildInstallSizeEntry(makePkg('c'), 300_000, 6_000_000, 400),
  ];

  it('sums publish and install sizes', () => {
    const summary = summarizeInstallSizes(entries);
    expect(summary.totalPublish).toBe(360_000);
    expect(summary.totalInstall).toBe(6_800_000);
  });

  it('identifies the largest package', () => {
    const summary = summarizeInstallSizes(entries);
    expect(summary.largestPackage).toBe('c');
  });

  it('counts flagged packages', () => {
    const summary = summarizeInstallSizes(entries);
    expect(summary.flaggedCount).toBe(2); // b=warn, c=danger
  });

  it('handles a single entry', () => {
    const single = [buildInstallSizeEntry(makePkg('solo'), 5_000, 40_000, 5)];
    const summary = summarizeInstallSizes(single);
    expect(summary.largestPackage).toBe('solo');
    expect(summary.flaggedCount).toBe(0);
  });
});
