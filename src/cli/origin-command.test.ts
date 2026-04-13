import { Command } from 'commander';
import { printOriginTable, registerOriginCommand } from './origin-command';
import { OriginEntry } from '../core/dependency-origin-checker';

function makeEntry(overrides: Partial<OriginEntry> = {}): OriginEntry {
  return {
    name: 'some-pkg',
    version: '^1.0.0',
    origin: 'npm',
    risk: 'low',
    sourceUrl: null,
    flags: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerOriginCommand(program);
  return program;
}

describe('printOriginTable', () => {
  it('prints without error for empty list', () => {
    expect(() => printOriginTable([])).not.toThrow();
  });

  it('prints npm low-risk entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printOriginTable([makeEntry()]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints flags for high-risk entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printOriginTable([makeEntry({ origin: 'local', risk: 'high', flags: ['local-path dependency'] })]);
    const calls = spy.mock.calls.map((c) => c[0] as string);
    expect(calls.some((c) => c.includes('local-path dependency'))).toBe(true);
    spy.mockRestore();
  });

  it('renders medium risk entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printOriginTable([makeEntry({ origin: 'github', risk: 'medium', flags: ['git dependency'] })]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('registerOriginCommand', () => {
  it('registers origin command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'origin');
    expect(cmd).toBeDefined();
  });

  it('has --high-risk-only option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'origin')!;
    const opt = cmd.options.find((o) => o.long === '--high-risk-only');
    expect(opt).toBeDefined();
  });

  it('has --path option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'origin')!;
    const opt = cmd.options.find((o) => o.long === '--path');
    expect(opt).toBeDefined();
  });
});
