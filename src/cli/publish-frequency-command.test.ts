import { Command } from 'commander';
import { registerPublishFrequencyCommand, printPublishFrequencyTable } from './publish-frequency-command';
import type { PublishFrequencyEntry } from '../types';

function makeEntry(
  name: string,
  band: string,
  avgDays: number
): PublishFrequencyEntry {
  return {
    name,
    currentVersion: '1.0.0',
    releaseCount: 12,
    avgDaysBetweenReleases: avgDays,
    frequencyBand: band as any,
    firstReleaseDate: '2021-01-01',
    latestReleaseDate: '2024-06-01',
    summary: `Publishes every ~${avgDays} days`,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerPublishFrequencyCommand(program);
  return program;
}

describe('registerPublishFrequencyCommand', () => {
  it('registers the publish-frequency command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'publish-frequency');
    expect(cmd).toBeDefined();
  });

  it('has expected options', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'publish-frequency')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--path');
    expect(optionNames).toContain('--format');
    expect(optionNames).toContain('--dormant-only');
  });
});

describe('printPublishFrequencyTable', () => {
  it('prints without throwing for empty list', () => {
    expect(() => printPublishFrequencyTable([])).not.toThrow();
  });

  it('prints entries for each package', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const entries = [
      makeEntry('lodash', 'moderate', 30),
      makeEntry('axios', 'high', 7),
      makeEntry('left-pad', 'dormant', 365),
    ];
    printPublishFrequencyTable(entries);
    const output = spy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('lodash');
    expect(output).toContain('axios');
    expect(output).toContain('left-pad');
    spy.mockRestore();
  });

  it('displays band for each entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printPublishFrequencyTable([makeEntry('react', 'high', 5)]);
    const output = spy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('high');
    spy.mockRestore();
  });
});
