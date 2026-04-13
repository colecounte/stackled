import { Command } from 'commander';
import { printLifecycleTable, registerLifecycleCommand } from './lifecycle-command';
import { LifecycleEntry } from '../core/dependency-lifecycle-tracker';

function makeEntry(overrides: Partial<LifecycleEntry> = {}): LifecycleEntry {
  return {
    name: 'some-pkg',
    version: '2.0.0',
    stage: 'active',
    ageInDays: 400,
    daysSinceLastRelease: 20,
    releaseCount: 30,
    score: 88,
    reason: 'Stage: active',
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerLifecycleCommand(program);
  return program;
}

describe('printLifecycleTable', () => {
  it('prints without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printLifecycleTable([makeEntry(), makeEntry({ name: 'old-pkg', stage: 'abandoned', score: 10 })]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles empty list', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printLifecycleTable([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('registerLifecycleCommand', () => {
  it('registers the lifecycle command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'lifecycle');
    expect(cmd).toBeDefined();
  });

  it('has --json and --stage options', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'lifecycle')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--json');
    expect(optionNames).toContain('--stage');
  });
});
