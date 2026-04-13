import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { printChurnTable } from './churn-command.js';
import type { ChurnEntry } from '../core/dependency-churn-analyzer.js';

function makeEntry(overrides: Partial<ChurnEntry> = {}): ChurnEntry {
  return {
    name: 'react',
    currentVersion: '18.0.0',
    releaseCount: 20,
    majorCount: 2,
    minorCount: 8,
    patchCount: 10,
    churnScore: 65,
    churnLevel: 'high',
    avgDaysBetweenReleases: 18,
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  return program;
}

describe('printChurnTable', () => {
  it('prints without throwing for valid entries', () => {
    const entries = [
      makeEntry({ name: 'react', churnLevel: 'high', churnScore: 65 }),
      makeEntry({ name: 'lodash', churnLevel: 'low', churnScore: 10 }),
    ];
    expect(() => printChurnTable(entries)).not.toThrow();
  });

  it('handles empty entries', () => {
    expect(() => printChurnTable([])).not.toThrow();
  });

  it('sorts by churnScore descending', () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: string) => logs.push(msg ?? ''));
    const entries = [
      makeEntry({ name: 'low-pkg', churnScore: 5, churnLevel: 'low' }),
      makeEntry({ name: 'high-pkg', churnScore: 80, churnLevel: 'extreme' }),
    ];
    printChurnTable(entries);
    const tableLines = logs.filter((l) => l.includes('high-pkg') || l.includes('low-pkg'));
    expect(tableLines[0]).toContain('high-pkg');
    vi.restoreAllMocks();
  });
});

describe('registerChurnCommand', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the churn command on the program', async () => {
    const { registerChurnCommand } = await import('./churn-command.js');
    const program = buildProgram();
    registerChurnCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'churn');
    expect(cmd).toBeDefined();
  });

  it('command has expected options', async () => {
    const { registerChurnCommand } = await import('./churn-command.js');
    const program = buildProgram();
    registerChurnCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'churn')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--path');
    expect(optionNames).toContain('--min-score');
    expect(optionNames).toContain('--json');
  });
});
