import { Command } from 'commander';
import { registerForkCommand, printForkTable } from './fork-command';
import * as forkDetector from '../core/dependency-fork-detector';
import * as packageParser from '../core/package-parser';
import * as configManager from '../core/config-manager';

function makeEntry(overrides: Partial<forkDetector.ForkEntry> = {}): forkDetector.ForkEntry {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    risk: 'low',
    forks: 5,
    originalPackage: undefined,
    flags: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerForkCommand(program);
  return program;
}

describe('printForkTable', () => {
  it('prints no concerns message for empty array', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printForkTable([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No fork concerns'));
    spy.mockRestore();
  });

  it('prints table rows for entries', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printForkTable([makeEntry({ name: 'my-fork', risk: 'high', forks: 300 })]);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('my-fork');
    spy.mockRestore();
  });
});

describe('registerForkCommand', () => {
  beforeEach(() => {
    jest.spyOn(configManager, 'loadConfig').mockResolvedValue({ packageJsonPath: 'package.json' } as any);
    jest.spyOn(packageParser, 'parsePackageJson').mockResolvedValue([] as any);
    jest.spyOn(forkDetector, 'detectForks').mockReturnValue([makeEntry()]);
    jest.spyOn(forkDetector, 'summarizeForks').mockReturnValue({ total: 1, highRisk: 0, mediumRisk: 0 });
  });

  afterEach(() => jest.restoreAllMocks());

  it('outputs JSON when --json flag is provided', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'forks', '--json']);
    const output = spy.mock.calls.map(c => c[0]).join('');
    expect(() => JSON.parse(output)).not.toThrow();
    spy.mockRestore();
  });

  it('filters entries by risk level', async () => {
    jest.spyOn(forkDetector, 'detectForks').mockReturnValue([
      makeEntry({ risk: 'low' }),
      makeEntry({ name: 'risky', risk: 'high' }),
    ]);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'forks', '--risk', 'high']);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('risky');
    spy.mockRestore();
  });

  it('handles errors gracefully', async () => {
    jest.spyOn(packageParser, 'parsePackageJson').mockRejectedValue(new Error('file not found'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const program = buildProgram();
    await expect(program.parseAsync(['node', 'stackled', 'forks'])).rejects.toThrow();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
