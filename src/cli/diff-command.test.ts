import { Command } from 'commander';
import { printDiffTable, registerDiffCommand } from './diff-command';
import { DependencyDiffEntry } from '../core/dependency-diff';

const makeEntry = (
  name: string,
  changeType: DependencyDiffEntry['changeType'],
  fromVersion: string | null = '1.0.0',
  toVersion: string | null = '2.0.0'
): DependencyDiffEntry => ({ name, changeType, fromVersion, toVersion });

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerDiffCommand(program);
  return program;
}

describe('printDiffTable', () => {
  it('prints a message when no changes are detected', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printDiffTable([makeEntry('lodash', 'unchanged', '4.0.0', '4.0.0')]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No dependency changes'));
    spy.mockRestore();
  });

  it('prints added, removed, upgraded, downgraded entries', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printDiffTable([
      makeEntry('react', 'upgraded', '17.0.0', '18.0.0'),
      makeEntry('lodash', 'removed', '4.0.0', null),
      makeEntry('zod', 'added', null, '3.0.0'),
    ]);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toMatch(/react/);
    expect(output).toMatch(/lodash/);
    expect(output).toMatch(/zod/);
    spy.mockRestore();
  });

  it('prints a summary line', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printDiffTable([makeEntry('axios', 'upgraded')]);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toMatch(/upgraded/);
    spy.mockRestore();
  });
});

describe('registerDiffCommand', () => {
  it('registers the diff command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'diff');
    expect(cmd).toBeDefined();
  });

  it('exits with error when baseline file is missing', () => {
    const program = buildProgram();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => program.parse(['node', 'stackled', 'diff', 'nonexistent.json', 'also-missing.json']))
      .toThrow();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Baseline file not found'));
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
