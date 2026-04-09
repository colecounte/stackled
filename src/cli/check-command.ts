import { Command } from 'commander';
import { parsePackageJson } from '../core/package-parser';
import { analyzeDependencies } from '../core/dependency-analyzer';
import { checkForUpdates, filterByUpdateType } from '../core/update-checker';
import { generateReport } from '../core/report-generator';
import { formatNotification } from '../core/notification-formatter';
import { loadConfig } from '../core/config-manager';
import { readCache, writeCache } from '../core/cache-manager';
import { UpdateInfo } from '../types';
import path from 'path';

export function registerCheckCommand(program: Command): void {
  program
    .command('check [packagePath]')
    .description('Check dependencies for updates and breaking changes')
    .option('-f, --filter <type>', 'filter by update type: major, minor, patch', '')
    .option('--no-cache', 'bypass cache and fetch fresh data')
    .option('--json', 'output raw JSON report')
    .action(async (packagePath: string | undefined, options: CheckCommandOptions) => {
      await runCheckCommand(packagePath ?? '.', options);
    });
}

interface CheckCommandOptions {
  filter: string;
  cache: boolean;
  json: boolean;
}

export async function runCheckCommand(packagePath: string, options: CheckCommandOptions): Promise<void> {
  const config = await loadConfig();
  const resolvedPath = path.resolve(packagePath, 'package.json');

  console.log(`\n🔍 Scanning dependencies in ${resolvedPath}...\n`);

  const cacheKey = `check:${resolvedPath}`;
  let updates: UpdateInfo[] | null = null;

  if (options.cache && config.cacheEnabled) {
    updates = await readCache<UpdateInfo[]>(cacheKey, config.cacheTtlMinutes);
    if (updates) console.log('⚡ Using cached results\n');
  }

  if (!updates) {
    const dependencies = await parsePackageJson(resolvedPath);
    const filtered = config.includeDev ? dependencies : dependencies.filter(d => !d.isDev);
    const analyzed = await analyzeDependencies(filtered);
    updates = await checkForUpdates(analyzed);

    if (config.cacheEnabled) {
      await writeCache(cacheKey, updates);
    }
  }

  const filteredUpdates = options.filter
    ? filterByUpdateType(updates, options.filter as 'major' | 'minor' | 'patch')
    : updates;

  const report = await generateReport(filteredUpdates, resolvedPath);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const notification = formatNotification(report, config.outputFormat);
  console.log(notification);
}
