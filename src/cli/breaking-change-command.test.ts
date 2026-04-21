import { Command } from 'commander';
import { registerBreakingChangeCommand } from './breaking-change-command';
import * as tracker from '../core/dependency-breaking-change-tracker';
import * as parser from '../core/package-parser';
import * as configManager from '../core/config-manager';

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerBreakingChangeCommand(program);
  return program;
}

function makeEntry(
  name: string,
  level: tracker.BreakingChangeEntry['riskLevel']
): tracker.BreakingChangeEntry {
  return {
    name,
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    breakingChanges: [],
    riskLevel: level,
    affectedApis: [],
    migrationNotes: null,
  };
}

beforeEach(() => {
  jest.spyOn(configManager, 'loadConfig').mockResolvedValue({} as any);
  jest.spyOn(parser, 'parsePackageJson').mockResolvedValue([]);
});

afterEach(() => jest.restoreAllMocks());

describe('registerBreakingChangeCommand', () => {
  it('registers the breaking command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'breaking');
    expect(cmd).toBeDefined();
  });

  it('outputs JSON when --json flag is set', async () => {
    jest.spyOn(tracker, 'trackBreakingChanges').mockReturnValue([makeEntry('lodash', 'high')]);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'breaking', '--json']);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toContain('lodash');
    spy.mockRestore();
  });

  it('prints green message when no breaking changes', async () => {
    jest.spyOn(tracker, 'trackBreakingChanges').mockReturnValue([]);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'breaking']);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toContain('No breaking changes');
    spy.mockRestore();
  });

  it('prints table with entries when breaking changes exist', async () => {
    jest.spyOn(tracker, 'trackBreakingChanges').mockReturnValue([
      makeEntry('react', 'critical'),
    ]);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'breaking']);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toContain('react');
    spy.mockRestore();
  });
});
