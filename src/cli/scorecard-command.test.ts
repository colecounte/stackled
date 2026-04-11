import { Command } from 'commander';
import { printScorecardTable, registerScorecardCommand } from './scorecard-command';
import { aggregateScorecard, buildScorecardEntry } from '../core/scorecard-aggregator';
import { DependencyInfo } from '../types';

const makeDep = (name: string): DependencyInfo =>
  ({ name, version: '1.0.0', type: 'production' } as DependencyInfo);

describe('printScorecardTable', () => {
  it('prints without throwing for empty entries', () => {
    const summary = aggregateScorecard([]);
    expect(() => printScorecardTable(summary)).not.toThrow();
  });

  it('prints entries with flags', () => {
    const entries = [
      buildScorecardEntry(makeDep('lodash'), 30, 20, 20, 20),
    ];
    const summary = aggregateScorecard(entries);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printScorecardTable(summary);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toMatch(/lodash/);
    spy.mockRestore();
  });

  it('shows clean indicator when no flags', () => {
    const entries = [
      buildScorecardEntry(makeDep('react'), 90, 90, 90, 90),
    ];
    const summary = aggregateScorecard(entries);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printScorecardTable(summary);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toMatch(/clean/);
    spy.mockRestore();
  });
});

describe('registerScorecardCommand', () => {
  it('registers the scorecard command', () => {
    const program = new Command();
    registerScorecardCommand(program);
    const names = program.commands.map(c => c.name());
    expect(names).toContain('scorecard');
  });

  it('scorecard command has expected options', () => {
    const program = new Command();
    registerScorecardCommand(program);
    const cmd = program.commands.find(c => c.name() === 'scorecard')!;
    const optionNames = cmd.options.map(o => o.long);
    expect(optionNames).toContain('--path');
    expect(optionNames).toContain('--min-score');
  });
});
