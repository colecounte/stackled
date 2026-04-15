import { Command } from 'commander';
import { printSentimentTable, registerSentimentCommand } from './sentiment-command';
import { SentimentEntry } from '../core/dependency-sentiment-analyzer';

function makeEntry(overrides: Partial<SentimentEntry> = {}): SentimentEntry {
  return {
    name: 'some-pkg',
    version: '1.2.3',
    score: 65,
    level: 'neutral',
    signals: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerSentimentCommand(program);
  return program;
}

describe('printSentimentTable', () => {
  it('prints without throwing for empty list', () => {
    expect(() => printSentimentTable([])).not.toThrow();
  });

  it('prints entries with signals', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printSentimentTable([
      makeEntry({ name: 'react', level: 'positive', score: 90, signals: ['high download volume'] }),
      makeEntry({ name: 'bad-pkg', level: 'critical', score: 5, signals: ['package is deprecated'] }),
    ]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints gray "none" when signals are empty', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation((line: string) => {
      if (typeof line === 'string' && line.includes('some-pkg')) {
        expect(line).toContain('none');
      }
    });
    printSentimentTable([makeEntry()]);
    spy.mockRestore();
  });
});

describe('registerSentimentCommand', () => {
  it('registers the sentiment command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'sentiment');
    expect(cmd).toBeDefined();
  });

  it('has --path option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'sentiment')!;
    const pathOpt = cmd.options.find(o => o.long === '--path');
    expect(pathOpt).toBeDefined();
  });

  it('has --min-score option', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'sentiment')!;
    const opt = cmd.options.find(o => o.long === '--min-score');
    expect(opt).toBeDefined();
  });
});
