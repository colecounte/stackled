import { Command } from 'commander';
import chalk from 'chalk';
import { printHealthTable, registerHealthCommand } from './health-command';
import { HealthScore } from '../core/health-scorer';

jest.mock('../core/package-parser');
jest.mock('../core/maintainer-checker');
jest.mock('../core/vulnerability-scanner');
jest.mock('../core/outdated-detector');

import { parsePackageJson } from '../core/package-parser';
import { checkMaintainers } from '../core/maintainer-checker';
import { summarizeVulnerabilities } from '../core/vulnerability-scanner';
import { detectOutdated } from '../core/outdated-detector';

const makeScore = (pkg: string, score: number): HealthScore => ({
  package: pkg,
  score,
  grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : score >= 35 ? 'D' : 'F',
  breakdown: { maintenance: score, security: score, freshness: score, popularity: score },
});

describe('printHealthTable', () => {
  it('prints header and rows without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printHealthTable([makeScore('react', 95), makeScore('lodash', 60)]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles empty list', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => printHealthTable([])).not.toThrow();
    spy.mockRestore();
  });
});

describe('registerHealthCommand', () => {
  beforeEach(() => {
    (parsePackageJson as jest.Mock).mockResolvedValue({
      dependencies: [{ name: 'react', version: '^18.0.0' }],
    });
    (checkMaintainers as jest.Mock).mockResolvedValue([
      { package: 'react', lastPublish: '', daysSinceLastPublish: 10, isAbandoned: false, maintainerCount: 3 },
    ]);
    (summarizeVulnerabilities as jest.Mock).mockResolvedValue({});
    (detectOutdated as jest.Mock).mockResolvedValue([]);
  });

  it('registers the health command on the program', () => {
    const program = new Command();
    registerHealthCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'health');
    expect(cmd).toBeDefined();
  });

  it('runs without error when mocks resolve', async () => {
    const program = new Command();
    registerHealthCommand(program);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await program.parseAsync(['node', 'stackled', 'health', '.'], { from: 'user' });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('exits on error', async () => {
    (parsePackageJson as jest.Mock).mockRejectedValue(new Error('not found'));
    const program = new Command();
    registerHealthCommand(program);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(program.parseAsync(['node', 'stackled', 'health', '.'], { from: 'user' })).rejects.toThrow();
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
