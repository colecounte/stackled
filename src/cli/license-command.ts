import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { checkLicenses, summarizeLicenseRisks, LicenseInfo } from '../core/license-checker';
import { loadConfig } from '../core/config-manager';

const RISK_COLORS: Record<string, (s: string) => string> = {
  low: chalk.green,
  medium: chalk.yellow,
  high: chalk.red,
  unknown: chalk.gray,
};

export function printLicenseTable(results: LicenseInfo[]): void {
  const header = `${'Package'.padEnd(35)} ${'Version'.padEnd(12)} ${'License'.padEnd(20)} Risk`;
  console.log(chalk.bold(header));
  console.log('─'.repeat(header.length));
  for (const r of results) {
    const colorFn = RISK_COLORS[r.risk] ?? chalk.white;
    const copyleftTag = r.isCopyleft ? chalk.magenta(' [copyleft]') : '';
    console.log(
      `${r.packageName.padEnd(35)} ${r.version.padEnd(12)} ${(r.license ?? 'UNKNOWN').padEnd(20)} ${colorFn(r.risk)}${copyleftTag}`
    );
  }
}

export function printLicenseSummary(results: LicenseInfo[]): void {
  const summary = summarizeLicenseRisks(results);
  console.log('');
  console.log(chalk.bold('License Risk Summary:'));
  console.log(`  ${chalk.green('Low risk')}:     ${summary.low}`);
  console.log(`  ${chalk.yellow('Medium risk')}:  ${summary.medium}`);
  console.log(`  ${chalk.red('High risk')}:    ${summary.high}`);
  console.log(`  ${chalk.gray('Unknown')}:      ${summary.unknown}`);
  if (summary.high > 0) {
    console.log(chalk.red('\n⚠  High-risk licenses detected. Review before shipping.'));
  }
}

export function registerLicenseCommand(program: Command): void {
  program
    .command('license')
    .description('Check licenses of all project dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--fail-on-high', 'Exit with code 1 if high-risk licenses are found')
    .option('--only-high', 'Show only high-risk licenses')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const pkgPath = options.path;
        const parsed = await parsePackageJson(pkgPath);
        const allPackages = Object.values(parsed.dependencies ?? {});
        let results = checkLicenses(allPackages);

        if (options.onlyHigh) {
          results = results.filter(r => r.risk === 'high');
        }

        if (results.length === 0) {
          console.log(chalk.green('No packages to report.'));
          return;
        }

        printLicenseTable(results);
        printLicenseSummary(results);

        if (options.failOnHigh) {
          const summary = summarizeLicenseRisks(results);
          if (summary.high > 0) process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red('Error running license check:'), (err as Error).message);
        process.exit(1);
      }
    });
}
