import { Command } from 'commander';
import { printOwnershipTable, printOwnershipSummary, registerOwnershipCommand } from './ownership-command';
import { OwnerEntry } from '../core/dependency-ownership-checker';

function makeEntry(overrides: Partial<OwnerEntry> = {}): OwnerEntry {
  return {
    name: 'express',
    ownerCount: 2,
    owners: ['alice', 'bob'],
    hasOrgOwner: false,
    risk: 'low',
    reason: 'Multiple individual owners',
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerOwnershipCommand(program);
  return program;
}

describe('printOwnershipTable', () => {
  it('renders without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printOwnershipTable([
      makeEntry({ risk: 'low' }),
      makeEntry({ name: 'lodash', risk: 'high', ownerCount: 0, owners: [], reason: 'No owners found' }),
    ]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('printOwnershipSummary', () => {
  it('prints summary counts', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printOwnershipSummary([
      makeEntry(),
      makeEntry({ name: 'b', ownerCount: 0, owners: [], risk: 'high' }),
      makeEntry({ name: 'c', ownerCount: 1, owners: ['solo'], risk: 'medium' }),
    ]);
    const output = spy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toMatch(/Total packages/);
    expect(output).toMatch(/No owner/);
    spy.mockRestore();
  });
});

describe('registerOwnershipCommand', () => {
  it('registers the ownership command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'ownership');
    expect(cmd).toBeDefined();
  });

  it('ownership command has --filter option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'ownership')!;
    const filterOpt = cmd.options.find((o) => o.long === '--filter');
    expect(filterOpt).toBeDefined();
  });

  it('ownership command has --json option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'ownership')!;
    const jsonOpt = cmd.options.find((o) => o.long === '--json');
    expect(jsonOpt).toBeDefined();
  });
});
