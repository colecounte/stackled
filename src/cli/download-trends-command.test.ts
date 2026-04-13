import { Command } from 'commander';
import { printDownloadTrendsTable, registerDownloadTrendsCommand } from './download-trends-command';
import { DownloadTrendEntry } from '../core/dependency-download-trends';

function makeEntry(overrides: Partial<DownloadTrendEntry> = {}): DownloadTrendEntry {
  return {
    name: 'some-pkg',
    currentVersion: '1.0.0',
    weeklyDownloads: 500_000,
    monthlyDownloads: 1_800_000,
    trend: 'rising',
    trendPercent: 11,
    grade: 'B',
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerDownloadTrendsCommand(program);
  return program;
}

describe('printDownloadTrendsTable', () => {
  it('prints without throwing for rising entry', () => {
    expect(() => printDownloadTrendsTable([makeEntry()])).not.toThrow();
  });

  it('prints without throwing for declining entry', () => {
    expect(() =>
      printDownloadTrendsTable([makeEntry({ trend: 'declining', grade: 'D', weeklyDownloads: 2000 })])
    ).not.toThrow();
  });

  it('handles unknown trend', () => {
    expect(() =>
      printDownloadTrendsTable([makeEntry({ trend: 'unknown', weeklyDownloads: 0, monthlyDownloads: 0 })])
    ).not.toThrow();
  });

  it('renders all grade colors without error', () => {
    const entries: DownloadTrendEntry[] = (['A', 'B', 'C', 'D', 'F'] as const).map((grade) =>
      makeEntry({ grade })
    );
    expect(() => printDownloadTrendsTable(entries)).not.toThrow();
  });

  it('renders empty table without error', () => {
    expect(() => printDownloadTrendsTable([])).not.toThrow();
  });
});

describe('registerDownloadTrendsCommand', () => {
  it('registers the download-trends command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'download-trends');
    expect(cmd).toBeDefined();
  });

  it('has --path option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'download-trends')!;
    const pathOpt = cmd.options.find((o) => o.long === '--path');
    expect(pathOpt).toBeDefined();
  });

  it('has --min-grade option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'download-trends')!;
    const gradeOpt = cmd.options.find((o) => o.long === '--min-grade');
    expect(gradeOpt).toBeDefined();
  });
});
