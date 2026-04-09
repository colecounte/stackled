import { Command } from 'commander';
import { registerResolveCommand } from './resolve-command';
import * as packageParser from '../core/package-parser';
import * as dependencyAnalyzer from '../core/dependency-analyzer';
import * as versionResolver from '../core/version-resolver';

jest.mock('../core/package-parser');
jest.mock('../core/dependency-analyzer');
jest.mock('../core/version-resolver');

const mockDependencies = [
  { name: 'react', currentVersion: '^18.0.0', latestVersion: '18.2.0', type: 'dependency' },
  { name: 'lodash', currentVersion: '4.17.21', latestVersion: '4.17.21', type: 'dependency' },
];

const mockResolved = [
  { dependency: 'react', currentVersion: '^18.0.0', resolvedVersion: '18.0.0', isValid: true, isRange: true },
  { dependency: 'lodash', currentVersion: '4.17.21', resolvedVersion: '4.17.21', isValid: true, isRange: false },
];

describe('registerResolveCommand', () => {
  let program: Command;
  let consoleSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    program = new Command();
    registerResolveCommand(program);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    (packageParser.loadPackageJson as jest.Mock).mockResolvedValue({ name: 'test', version: '1.0.0' });
    (dependencyAnalyzer.analyzeDependencies as jest.Mock).mockResolvedValue(mockDependencies);
    (versionResolver.resolveDependencyVersions as jest.Mock).mockReturnValue(mockResolved);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register the resolve command', () => {
    const cmd = program.commands.find((c) => c.name() === 'resolve');
    expect(cmd).toBeDefined();
  });

  it('should call resolveDependencyVersions with analyzed dependencies', async () => {
    await program.parseAsync(['node', 'stackled', 'resolve', '.']);
    expect(versionResolver.resolveDependencyVersions).toHaveBeenCalledWith(mockDependencies);
  });

  it('should output JSON when --json flag is provided', async () => {
    await program.parseAsync(['node', 'stackled', 'resolve', '.', '--json']);
    const jsonOutput = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(jsonOutput);
    expect(parsed).toEqual(mockResolved);
  });

  it('should filter to ranges only when --ranges-only flag is provided', async () => {
    await program.parseAsync(['node', 'stackled', 'resolve', '.', '--ranges-only', '--json']);
    const jsonOutput = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(jsonOutput);
    expect(parsed.every((r: { isRange: boolean }) => r.isRange)).toBe(true);
  });

  it('should handle errors and exit with code 1', async () => {
    (packageParser.loadPackageJson as jest.Mock).mockRejectedValue(new Error('File not found'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    await program.parseAsync(['node', 'stackled', 'resolve', '.']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
  });
});
