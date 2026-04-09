import { Command } from 'commander';
import { registerScanCommand } from './scan-command';
import * as packageParser from '../core/package-parser';
import * as dependencyAnalyzer from '../core/dependency-analyzer';
import * as updateChecker from '../core/update-checker';
import * as reportGenerator from '../core/report-generator';
import * as notificationFormatter from '../core/notification-formatter';
import * as cacheManager from '../core/cache-manager';
import * as configManager from '../core/config-manager';

jest.mock('../core/package-parser');
jest.mock('../core/dependency-analyzer');
jest.mock('../core/update-checker');
jest.mock('../core/report-generator');
jest.mock('../core/notification-formatter');
jest.mock('../core/cache-manager');
jest.mock('../core/config-manager');

const mockReport = { dependencies: [], summary: { total: 0, breaking: 0, outdated: 0 } };

beforeEach(() => {
  jest.clearAllMocks();
  (configManager.loadConfig as jest.Mock).mockResolvedValue({ outputFormat: 'text' });
  (cacheManager.readCache as jest.Mock).mockResolvedValue(null);
  (cacheManager.writeCache as jest.Mock).mockResolvedValue(undefined);
  (packageParser.parsePackageJson as jest.Mock).mockResolvedValue([]);
  (dependencyAnalyzer.analyzeDependencies as jest.Mock).mockResolvedValue([]);
  (updateChecker.checkForUpdates as jest.Mock).mockResolvedValue([]);
  (reportGenerator.generateReport as jest.Mock).mockReturnValue(mockReport);
  (notificationFormatter.formatNotification as jest.Mock).mockReturnValue('formatted output');
});

describe('registerScanCommand', () => {
  it('registers the scan command on the program', () => {
    const program = new Command();
    registerScanCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'scan');
    expect(cmd).toBeDefined();
  });

  it('returns cached results when cache is available', async () => {
    (cacheManager.readCache as jest.Mock).mockResolvedValue(mockReport);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const program = new Command();
    registerScanCommand(program);
    await program.parseAsync(['node', 'stackled', 'scan']);
    expect(packageParser.parsePackageJson).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('runs full scan when cache is empty', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const program = new Command();
    registerScanCommand(program);
    await program.parseAsync(['node', 'stackled', 'scan']);
    expect(packageParser.parsePackageJson).toHaveBeenCalled();
    expect(reportGenerator.generateReport).toHaveBeenCalled();
    expect(cacheManager.writeCache).toHaveBeenCalledWith('scan-results', mockReport);
    consoleSpy.mockRestore();
  });

  it('outputs JSON when format is json', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const program = new Command();
    registerScanCommand(program);
    await program.parseAsync(['node', 'stackled', 'scan', '--format', 'json']);
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockReport, null, 2));
    consoleSpy.mockRestore();
  });

  it('exits with code 1 on scan failure', async () => {
    (packageParser.parsePackageJson as jest.Mock).mockRejectedValue(new Error('parse error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const program = new Command();
    registerScanCommand(program);
    await expect(program.parseAsync(['node', 'stackled', 'scan'])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
