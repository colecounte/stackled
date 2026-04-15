import { Command } from 'commander';
import { registerMaintainerRiskCommand, printMaintainerRiskTable } from './maintainer-risk-command';
import { MaintainerRiskEntry } from '../core/dependency-maintainer-risk';

function makeEntry(overrides: Partial<MaintainerRiskEntry> = {}): MaintainerRiskEntry {
  return {
    name: 'some-pkg',
    version: '1.0.0',
    maintainerCount: 1,
    daysSinceLastPublish: 400,
    riskLevel: 'high',
    riskScore: 55,
    flags: ['single-maintainer', 'inactive-1yr'],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerMaintainerRiskCommand(program);
  return program;
}

describe('printMaintainerRiskTable', () => {
  it('prints no issues message for empty list', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printMaintainerRiskTable([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No maintainer risk'));
    spy.mockRestore();
  });

  it('prints header and rows for entries', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printMaintainerRiskTable([makeEntry(), makeEntry({ name: 'other-pkg', riskLevel: 'critical' })]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Package'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('some-pkg'));
    spy.mockRestore();
  });

  it('shows dash for empty flags', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printMaintainerRiskTable([makeEntry({ flags: [] })]);
    const calls = spy.mock.calls.map((c) => c[0] as string);
    expect(calls.some((c) => c.includes('-'))).toBe(true);
    spy.mockRestore();
  });
});

describe('registerMaintainerRiskCommand', () => {
  it('registers the maintainer-risk command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'maintainer-risk');
    expect(cmd).toBeDefined();
  });

  it('has --min-risk option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'maintainer-risk')!;
    const opt = cmd.options.find((o) => o.long === '--min-risk');
    expect(opt).toBeDefined();
  });

  it('has --json option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'maintainer-risk')!;
    const opt = cmd.options.find((o) => o.long === '--json');
    expect(opt).toBeDefined();
  });
});
