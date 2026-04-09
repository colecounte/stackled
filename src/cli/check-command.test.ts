import { runCheckCommand } from './check-command';
import * as packageParser from '../core/package-parser';
import * as dependencyAnalyzer from '../core/dependency-analyzer';
import * as updateChecker from '../core/update-checker';
import * as reportGenerator from '../core/report-generator';
import * as notificationFormatter from '../core/notification-formatter';
import * as configManager from '../core/config-manager';
import * as cacheManager from '../core/cache-manager';

jest.mock('../core/package-parser');
jest.mock('../core/dependency-analyzer');
jest.mock('../core/update-checker');
jest.mock('../core/report-generator');
jest.mock('../core/notification-formatter');
jest.mock('../core/config-manager');
jest.mock('../core/cache-manager');

const mockConfig = {
  outputFormat: 'table',
  includeDev: true,
  severityThreshold: 'low',
  cacheEnabled: false,
  cacheTtlMinutes: 60,
  ignorePackages: [],
};

const mockUpdates = [{ dependency: { name: 'express', currentVersion: '4.17.0', versionRange: '^4.17.0', isDev: false }, latestVersion: '4.18.2', updateType: 'minor', metadata: {} }];
const mockReport = { generatedAt: new Date(), projectName: 'test', totalDependencies: 1, outdatedCount: 1, criticalCount: 0, results: [] };

beforeEach(() => {
  jest.clearAllMocks();
  (configManager.loadConfig as jest.Mock).mockResolvedValue(mockConfig);
  (packageParser.parsePackageJson as jest.Mock).mockResolvedValue([]);
  (dependencyAnalyzer.analyzeDependencies as jest.Mock).mockResolvedValue([]);
  (updateChecker.checkForUpdates as jest.Mock).mockResolvedValue(mockUpdates);
  (updateChecker.filterByUpdateType as jest.Mock).mockReturnValue(mockUpdates);
  (reportGenerator.generateReport as jest.Mock).mockResolvedValue(mockReport);
  (notificationFormatter.formatNotification as jest.Mock).mockReturnValue('formatted output');
  (cacheManager.readCache as jest.Mock).mockResolvedValue(null);
  (cacheManager.writeCache as jest.Mock).mockResolvedValue(undefined);
});

describe('runCheckCommand', () => {
  it('runs the full pipeline and prints formatted output', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await runCheckCommand('.', { filter: '', cache: false, json: false });
    expect(reportGenerator.generateReport).toHaveBeenCalled();
    expect(notificationFormatter.formatNotification).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('formatted output');
    consoleSpy.mockRestore();
  });

  it('outputs JSON when --json flag is set', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await runCheckCommand('.', { filter: '', cache: false, json: true });
    const jsonCall = consoleSpy.mock.calls.find(c => c[0].startsWith('{'));
    expect(jsonCall).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('uses cached results when cache is enabled and data exists', async () => {
    (configManager.loadConfig as jest.Mock).mockResolvedValue({ ...mockConfig, cacheEnabled: true });
    (cacheManager.readCache as jest.Mock).mockResolvedValue(mockUpdates);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await runCheckCommand('.', { filter: '', cache: true, json: false });
    expect(packageParser.parsePackageJson).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('applies filter when filter option is provided', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await runCheckCommand('.', { filter: 'major', cache: false, json: false });
    expect(updateChecker.filterByUpdateType).toHaveBeenCalledWith(mockUpdates, 'major');
    consoleSpy.mockRestore();
  });
});
