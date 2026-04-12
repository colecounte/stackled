import { Command } from 'commander';
import { printFreshnessTable, registerFreshnessCommand } from './freshness-command';
import { FreshnessEntry } from '../core/changelog-freshness-checker';

function makeEntry(overrides: Partial<FreshnessEntry> = {}): FreshnessEntry {
  return {
    name: 'pkg',
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    daysSinceRelease: 5,
    changelogUpdated: true,
    freshnessScore: 90,
    status: 'fresh',
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerFreshnessCommand(program);
  return program;
}

describe('printFreshnessTable', () => {
  it('prints header and rows without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printFreshnessTable([makeEntry(), makeEntry({ name: 'other', status: 'stale', freshnessScore: 50 })]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints gray message for empty list', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printFreshnessTable([]);
    const calls = spy.mock.calls.map(c => c[0]);
    expect(calls.some(c => /No packages/.test(c))).toBe(true);
    spy.mockRestore();
  });

  it('shows n/a for unknown daysSinceRelease', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printFreshnessTable([makeEntry({ daysSinceRelease: -1, status: 'unknown' })]);
    const output = spy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('n/a');
    spy.mockRestore();
  });
});

describe('registerFreshnessCommand', () => {
  it('registers freshness command on program', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'freshness');
    expect(cmd).toBeDefined();
  });

  it('freshness command has --json option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'freshness')!;
    const jsonOpt = cmd.options.find(o => o.long === '--json');
    expect(jsonOpt).toBeDefined();
  });

  it('freshness command has --min-score option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'freshness')!;
    const opt = cmd.options.find(o => o.long === '--min-score');
    expect(opt).toBeDefined();
  });
});
