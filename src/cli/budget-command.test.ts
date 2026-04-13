import { Command } from 'commander';
import { registerBudgetCommand, printBudgetTable } from './budget-command';
import { BudgetEntry } from '../core/dependency-size-budget';

function makeEntry(overrides: Partial<BudgetEntry> = {}): BudgetEntry {
  return {
    name: 'lodash',
    currentVersion: '4.17.21',
    sizeBytes: 20_000,
    budgetBytes: 51_200,
    overageBytes: 0,
    status: 'ok',
    percentUsed: 39.1,
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerBudgetCommand(program);
  return program;
}

describe('printBudgetTable', () => {
  it('prints without throwing for ok entries', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printBudgetTable([makeEntry()]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints warning and exceeded entries', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printBudgetTable([
      makeEntry({ name: 'react', status: 'warning', percentUsed: 85 }),
      makeEntry({ name: 'moment', status: 'exceeded', sizeBytes: 70_000, overageBytes: 18_800, percentUsed: 136.7 }),
    ]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles empty entries array', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printBudgetTable([]);
    expect(spy).toHaveBeenCalledTimes(2); // header + divider
    spy.mockRestore();
  });
});

describe('registerBudgetCommand', () => {
  it('registers the budget command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'budget');
    expect(cmd).toBeDefined();
  });

  it('has expected options', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'budget')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--path');
    expect(optionNames).toContain('--default-budget');
    expect(optionNames).toContain('--warn-threshold');
    expect(optionNames).toContain('--only-violations');
  });
});
