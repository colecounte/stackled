import { Command } from 'commander';
import { printHealthTable, registerChangelogHealthCommand } from './changelog-health-command';
import { ChangelogHealthEntry } from '../core/dependency-changelog-health';

function makeEntry(overrides: Partial<ChangelogHealthEntry> = {}): ChangelogHealthEntry {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    status: 'healthy',
    hasChangelog: true,
    lastEntryDaysAgo: 10,
    entryCount: 12,
    score: 95,
    flags: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerChangelogHealthCommand(program);
  return program;
}

describe('printHealthTable', () => {
  it('prints without throwing for healthy entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printHealthTable([makeEntry()]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles missing entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printHealthTable([makeEntry({ status: 'missing', hasChangelog: false, lastEntryDaysAgo: null, entryCount: 0, score: 0 })]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints summary line', () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation((msg = '') => logs.push(String(msg)));
    printHealthTable([makeEntry(), makeEntry({ name: 'b', status: 'stale', lastEntryDaysAgo: 400 })]);
    const combined = logs.join('\n');
    expect(combined).toContain('Total');
    jest.restoreAllMocks();
  });

  it('handles empty entries list', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => printHealthTable([])).not.toThrow();
    spy.mockRestore();
  });
});

describe('registerChangelogHealthCommand', () => {
  it('registers changelog-health command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'changelog-health');
    expect(cmd).toBeDefined();
  });

  it('has --missing-only option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'changelog-health')!;
    const opt = cmd.options.find(o => o.long === '--missing-only');
    expect(opt).toBeDefined();
  });

  it('has --path option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'changelog-health')!;
    const opt = cmd.options.find(o => o.long === '--path');
    expect(opt).toBeDefined();
  });
});
