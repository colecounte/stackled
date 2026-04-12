import { Command } from 'commander';
import { printInsightsTable, registerInsightsCommand } from './insights-command';
import { InsightEntry } from '../core/dependency-insights';

function makeEntry(overrides: Partial<InsightEntry> = {}): InsightEntry {
  return {
    name: 'lodash',
    version: '4.17.21',
    insights: [],
    score: 95,
    grade: 'A',
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerInsightsCommand(program);
  return program;
}

describe('printInsightsTable', () => {
  it('prints without throwing for empty list', () => {
    expect(() => printInsightsTable([])).not.toThrow();
  });

  it('prints entries with grade A', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printInsightsTable([makeEntry()]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints entries with critical grade F', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printInsightsTable([
      makeEntry({ grade: 'F', score: 10, insights: ['Package is deprecated'] }),
    ]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows No issues for healthy packages', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printInsightsTable([makeEntry({ insights: [] })]);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('No issues');
    spy.mockRestore();
  });
});

describe('registerInsightsCommand', () => {
  it('registers the insights command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'insights');
    expect(cmd).toBeDefined();
  });

  it('has --json option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'insights')!;
    const jsonOpt = cmd.options.find(o => o.long === '--json');
    expect(jsonOpt).toBeDefined();
  });

  it('has --path option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'insights')!;
    const pathOpt = cmd.options.find(o => o.long === '--path');
    expect(pathOpt).toBeDefined();
  });
});
