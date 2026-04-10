import { Command } from 'commander';
import chalk from 'chalk';
import { registerEngineCommand } from './engine-command';
import * as engineChecker from '../core/engine-compatibility-checker';
import * as configManager from '../core/config-manager';
import type { EngineCompatibilityResult } from '../types';

jest.mock('../core/engine-compatibility-checker');
jest.mock('../core/config-manager');

const mockAnalyze = engineChecker.analyzeEngineCompatibility as jest.MockedFunction<
  typeof engineChecker.analyzeEngineCompatibility
>;
const mockLoadConfig = configManager.loadConfig as jest.MockedFunction<
  typeof configManager.loadConfig
>;

function makeResult(packageName: string, compatible: boolean): EngineCompatibilityResult {
  return {
    packageName,
    requiredRange: '>=16.0.0',
    currentVersion: '18.12.0',
    compatible,
    message: compatible ? undefined : `Requires >=20.0.0 but found 18.12.0`,
  };
}

describe('registerEngineCommand', () => {
  let program: Command;
  let consoleSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerEngineCommand(program);

    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockLoadConfig.mockResolvedValue({} as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prints a success message when all packages are compatible', async () => {
    mockAnalyze.mockResolvedValue([makeResult('express', true)]);

    await program.parseAsync(['node', 'stackled', 'engine']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('compatible');
  });

  it('prints incompatible packages in the table', async () => {
    mockAnalyze.mockResolvedValue([
      makeResult('react', true),
      makeResult('some-old-lib', false),
    ]);

    await program.parseAsync(['node', 'stackled', 'engine']);

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('some-old-lib');
    expect(output).toContain('incompatible');
  });

  it('exits with code 1 when --fail-on-incompatible and incompatibilities exist', async () => {
    mockAnalyze.mockResolvedValue([makeResult('bad-pkg', false)]);

    await program.parseAsync(['node', 'stackled', 'engine', '--fail-on-incompatible']);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does not exit with code 1 when all compatible even with --fail-on-incompatible', async () => {
    mockAnalyze.mockResolvedValue([makeResult('good-pkg', true)]);

    await program.parseAsync(['node', 'stackled', 'engine', '--fail-on-incompatible']);

    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('handles errors gracefully', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAnalyze.mockRejectedValue(new Error('network failure'));

    await program.parseAsync(['node', 'stackled', 'engine']);

    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
