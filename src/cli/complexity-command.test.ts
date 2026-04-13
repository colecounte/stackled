import { Command } from 'commander';
import { registerComplexityCommand, printComplexityTable } from './complexity-command';
import { ComplexityEntry } from '../types';

function makeEntry(name: string, score: number, grade: string): ComplexityEntry {
  return { name, version: '1.0.0', score, grade, depth: 1, versionSpread: 1, transitiveDeps: 3 };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerComplexityCommand(program);
  return program;
}

describe('registerComplexityCommand', () => {
  it('registers the complexity command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'complexity');
    expect(cmd).toBeDefined();
  });

  it('has --format option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'complexity')!;
    const opt = cmd.options.find(o => o.long === '--format');
    expect(opt).toBeDefined();
  });

  it('has --min-grade option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'complexity')!;
    const opt = cmd.options.find(o => o.long === '--min-grade');
    expect(opt).toBeDefined();
  });
});

describe('printComplexityTable', () => {
  it('prints without throwing for empty list', () => {
    expect(() => printComplexityTable([])).not.toThrow();
  });

  it('prints without throwing for entries', () => {
    const entries = [
      makeEntry('lodash', 15, 'A'),
      makeEntry('react', 72, 'D'),
    ];
    expect(() => printComplexityTable(entries)).not.toThrow();
  });
});
