import { Command } from 'commander';
import { parsePackageJson } from '../core/package-parser';
import { analyzeDependencies } from '../core/dependency-analyzer';
import { checkForUpdates } from '../core/update-checker';
import { generateReport } from '../core/report-generator';
import { formatNotification } from '../core/notification-formatter';
import { loadConfig } from '../core/config-manager';
import { readCache, writeCache } from '../core/cache-manager';
import type { ScanOptions, DependencyReport } from '../types';
import path from 'path';

const CACHE_KEY = 'scan-results';

export function registerScanCommand(program: Command): void {
  program
    .command('scan')
    .description('Scan project dependencies for breaking changes and outdated packages')
    .option('-p, --path <path>', 'Path to package.json', './package.json')
    .option('-f, --format <format>', 'Output format: text | json | markdown', 'text')
    .option('--no-cache', 'Bypass cache and force fresh scan')
    .option('--filter <type>', 'Filter by update type: major | minor | patch')
    .action(async (options: ScanOptions) => {
      try {
        const config = await loadConfig();
        const packagePath = path.resolve(options.path ?? './package.json');

        if (options.cache !== false) {
          const cached = await readCache<DependencyReport>(CACHE_KEY);
          if (cached) {
            outputReport(cached, options.format ?? config.outputFormat ?? 'text');
            return;
          }
        }

        console.log('🔍 Scanning dependencies...');

        const packages = await parsePackageJson(packagePath);
        const analyzed = await analyzeDependencies(packages);
        const updates = await checkForUpdates(
          analyzed,
          options.filter as 'major' | 'minor' | 'patch' | undefined
        );
        const report = generateReport(updates);

        await writeCache(CACHE_KEY, report);

        outputReport(report, options.format ?? config.outputFormat ?? 'text');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Scan failed: ${message}`);
        process.exit(1);
      }
    });
}

function outputReport(report: DependencyReport, format: string): void {
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const notification = formatNotification(report);
  console.log(notification);
}
