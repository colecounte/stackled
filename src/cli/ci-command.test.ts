import { printCiSummary, registerCiCommand } from './ci-command';
import { Command } from 'commander';
import { CiReport } from '../types';

const makeReport = (overrides: Partial<CiReport> = {}): CiReport => ({
  passed: true,
  overallScore: 85,
  threshold: 70,
  violations: [],
  warnings: [],
  scores: [],
  ...overrides,
});

describe('printCiSummary', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('prints PASSED when report passes', () => {
    printCiSummary(makeReport({ passed: true }));
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('PASSED');
    expect(output).toContain('✅');
  });

  it('prints FAILED when report fails', () => {
    printCiSummary(makeReport({ passed: false, overallScore: 40 }));
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('FAILED');
    expect(output).toContain('❌');
  });

  it('prints violations when present', () => {
    printCiSummary(makeReport({ passed: false, violations: ['score below threshold'] }));
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('score below threshold');
  });

  it('prints warnings when present', () => {
    printCiSummary(makeReport({ warnings: ['3 packages are outdated'] }));
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('3 packages are outdated');
  });

  it('displays score and threshold', () => {
    printCiSummary(makeReport({ overallScore: 72, threshold: 70 }));
    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('72');
    expect(output).toContain('70');
  });
});

describe('registerCiCommand', () => {
  it('registers the ci command on the program', () => {
    const program = new Command();
    registerCiCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'ci');
    expect(cmd).toBeDefined();
  });

  it('ci command has expected options', () => {
    const program = new Command();
    registerCiCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'ci')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--path');
    expect(optionNames).toContain('--threshold');
    expect(optionNames).toContain('--format');
    expect(optionNames).toContain('--fail-on-outdated');
  });
});
