import { Command } from 'commander';
import { registerReleaseCadenceCommand, bandColor, printReleaseCadenceTable } from './release-cadence-command';
import { ReleaseCadenceEntry } from '../core/dependency-release-cadence';

function makeEntry(overrides: Partial<ReleaseCadenceEntry> = {}): ReleaseCadenceEntry {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    totalReleases: 10,
    avgDaysBetweenReleases: 30,
    daysSinceLastRelease: 15,
    cadenceBand: 'regular',
    isHealthy: true,
    flags: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const p = new Command();
  p.exitOverride();
  registerReleaseCadenceCommand(p);
  return p;
}

describe('bandColor', () => {
  it('returns a string for each band', () => {
    expect(typeof bandColor('rapid')).toBe('string');
    expect(typeof bandColor('regular')).toBe('string');
    expect(typeof bandColor('slow')).toBe('string');
    expect(typeof bandColor('stagnant')).toBe('string');
  });

  it('includes the band name in the output', () => {
    expect(bandColor('rapid')).toContain('rapid');
    expect(bandColor('stagnant')).toContain('stagnant');
  });
});

describe('printReleaseCadenceTable', () => {
  it('prints without throwing for a valid entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printReleaseCadenceTable([makeEntry()]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows flags when present', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printReleaseCadenceTable([makeEntry({ flags: ['no recent releases'], isHealthy: false })]);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('no recent releases');
    spy.mockRestore();
  });

  it('shows checkmark for healthy entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printReleaseCadenceTable([makeEntry({ flags: [], isHealthy: true })]);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('✓');
    spy.mockRestore();
  });

  it('handles empty entries array', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printReleaseCadenceTable([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('registerReleaseCadenceCommand', () => {
  it('registers the cadence command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'cadence');
    expect(cmd).toBeDefined();
  });

  it('has expected options', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'cadence')!;
    const optionNames = cmd.options.map(o => o.long);
    expect(optionNames).toContain('--path');
    expect(optionNames).toContain('--band');
    expect(optionNames).toContain('--unhealthy');
  });
});
