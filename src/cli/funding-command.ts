import { Command } from 'commander';
import chalk from 'chalk';
import { checkFunding, summarizeFunding, FundingEntry } from '../core/funding-checker';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { fetchRegistryData } from '../core/registry-client';

export function printFundingTable(entries: FundingEntry[]): void {
  const col1 = 28;
  const col2 = 12;
  console.log(
    chalk.bold('Package'.padEnd(col1)) +
      chalk.bold('Version'.padEnd(col2)) +
      chalk.bold('Funding')
  );
  console.log('─'.repeat(70));
  for (const entry of entries) {
    const name = entry.name.padEnd(col1);
    const version = entry.version.padEnd(col2);
    if (entry.hasFunding) {
      const sources = entry.funding.map((f) => `${f.type}: ${f.url}`).join(', ');
      console.log(`${chalk.green(name)}${version}${chalk.cyan(sources)}`);
    } else {
      console.log(`${chalk.yellow(name)}${version}${chalk.gray('no funding info')}`);
    }
  }
}

export function printFundingSummary(entries: FundingEntry[]): void {
  const summary = summarizeFunding(entries);
  console.log();
  console.log(chalk.bold('Funding Summary'));
  console.log(`  Total packages : ${summary.total}`);
  console.log(`  Funded         : ${chalk.green(String(summary.funded))}`);
  console.log(`  Unfunded       : ${chalk.yellow(String(summary.unfunded))}`);
  console.log(`  Funded %       : ${summary.fundedPercent}%`);
}

export function registerFundingCommand(program: Command): void {
  program
    .command('funding')
    .description('Show funding information for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--unfunded', 'Show only unfunded packages')
    .action(async (opts) => {
      const config = loadConfig();
      const deps = parsePackageJson(opts.path);

      const registryMap: Record<string, Record<string, unknown>> = {};
      for (const dep of deps) {
        try {
          registryMap[dep.name] = await fetchRegistryData(dep.name, config);
        } catch {
          registryMap[dep.name] = {};
        }
      }

      let entries = checkFunding(deps, registryMap);
      if (opts.unfunded) {
        entries = entries.filter((e) => !e.hasFunding);
      }

      if (entries.length === 0) {
        console.log(chalk.green('All packages have funding information.'));
        return;
      }

      printFundingTable(entries);
      printFundingSummary(entries);
    });
}
