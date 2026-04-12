import { Command } from 'commander';
import chalk from 'chalk';
import { printUnusedTable, registerUnusedCommand } from './unused-command';
import { UnusedDependencyEntry } from '../core/unused-dependency-detector';

function makeEntry(
  name: string,
  confidence: UnusedDependencyEntry['confidence'] = 'high'
): UnusedDependencyEntry {
  return {
    name,
    version: '1.2.3',
    type: 'dependency',
    confidence,
    reason: 'No reference found in source files',
  };
}

describe('printUnusedTable', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('prints success message when no unused deps', () => {
    printUnusedTable([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No unused'));
  });

  it('prints table with entries', () => {
    const entries = [makeEntry('lodash'), makeEntry('moment', 'medium')];
    printUnusedTable(entries);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('lodash');
    expect(output).toContain('moment');
  });

  it('shows reason for each entry', () => {
    printUnusedTable([makeEntry('unused-pkg')]);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('No reference found');
  });
});

describe('registerUnusedCommand', () => {
  it('registers the unused command', () => {
    const program = new Command();
    registerUnusedCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'unused');
    expect(cmd).toBeDefined();
  });

  it('command has expected options', () => {
    const program = new Command();
    registerUnusedCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'unused')!;
    const optNames = cmd.options.map((o) => o.long);
    expect(optNames).toContain('--path');
    expect(optNames).toContain('--high-only');
    expect(optNames).toContain('--json');
  });
});
