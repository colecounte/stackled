import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { fetchRegistryData } from '../core/registry-client';
import { checkMaintainers, MaintainerStatus } from '../core/maintainer-checker';

export function printMaintainerTable(statuses: MaintainerStatus[]): void {
  console.log(
    chalk.bold(`\n${'Package'.padEnd(30)} ${'Maintainers'.padEnd(10)} ${'Days Since Publish'.padEnd(20)} Status`)
  );
  console.log('─'.repeat(80));

  for (const s of statuses) {
    const count = String(s.maintainers.length).padEnd(10);
    const days = s.daysSincePublish !== null ? String(s.daysSincePublish) : 'unknown';
    const daysCol = days.padEnd(20);
    const status = s.isAbandoned
      ? chalk.red('ABANDONED')
      : chalk.green('active');
    console.log(`${s.packageName.padEnd(30)} ${count} ${daysCol} ${status}`);
  }
}

export function printMaintainerSummary(statuses: MaintainerStatus[]): void {
  const abandoned = statuses.filter((s) => s.isAbandoned);
  console.log(`\n${chalk.bold('Summary:')} ${statuses.length} packages checked.`);
  if (abandoned.length > 0) {
    console.log(
      chalk.yellow(`  ⚠  ${abandoned.length} potentially abandoned (no publish in >${statuses[0]?.abandonedThresholdDays ?? 365} days):`)
    );
    abandoned.forEach((s) => console.log(`     - ${s.packageName} (${s.daysSincePublish} days)`));
  } else {
    console.log(chalk.green('  ✔  All packages appear actively maintained.'));
  }
}

export function registerMaintainerCommand(program: Command): void {
  program
    .command('maintainer')
    .description('Check maintainer activity and detect potentially abandoned packages')
    .option('--threshold <days>', 'Days of inactivity to consider abandoned', String(365))
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      const config = loadConfig();
      const packages = parsePackageJson(config.packageJsonPath ?? 'package.json');
      const names = packages.map((p) => p.name);
      const registryData = await fetchRegistryData(names);
      const threshold = parseInt(options.threshold, 10);
      const statuses = checkMaintainers(packages, registryData, threshold);

      if (options.json) {
        console.log(JSON.stringify(statuses, null, 2));
        return;
      }

      printMaintainerTable(statuses);
      printMaintainerSummary(statuses);
    });
}
