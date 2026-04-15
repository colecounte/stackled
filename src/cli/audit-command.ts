import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { scanPackages } from '../core/vulnerability-scanner';
import { VulnerabilityReport } from '../types';
import type { Vulnerability } from '../core/vulnerability-scanner';

const SEVERITY_COLORS: Record<string, chalk.Chalk> = {
  critical: chalk.bgRed.white,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.gray,
};

export function printAuditReport(report: VulnerabilityReport, format: string): void {
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(chalk.bold(`\nAudit Results: ${report.totalPackagesScanned} packages scanned`));
  if (report.vulnerablePackages === 0) {
    console.log(chalk.green('✔ No vulnerabilities found.'));
    return;
  }
  console.log(chalk.red(`✖ ${report.vulnerablePackages} vulnerable package(s) found\n`));
  for (const result of report.results) {
    console.log(chalk.bold(`  ${result.packageName}@${result.version}`));
    for (const v of result.vulnerabilities) {
      const color = SEVERITY_COLORS[v.severity] ?? chalk.white;
      console.log(`    ${color(`[${v.severity.toUpperCase()}]`)} ${v.title}`);
      if (v.patchedVersion) {
        console.log(chalk.dim(`      Patched in: ${v.patchedVersion}`));
      }
    }
  }
  console.log();
}

export function registerAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Scan dependencies for known vulnerabilities')
    .option('--format <format>', 'Output format: table or json', 'table')
    .option('--path <path>', 'Path to package.json', './package.json')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const packages = await parsePackageJson(options.path);
        const filtered = config.checkDevDependencies
          ? packages
          : packages.filter((p) => p.type === 'dependency');

        const report = await scanPackages(filtered, async (_name, _version): Promise<Vulnerability[]> => []);
        printAuditReport(report, options.format ?? config.outputFormat);

        if (report.criticalCount > 0 || report.highCount > 0) {
          process.exitCode = 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`✖ Audit failed: ${message}`));
        process.exitCode = 1;
      }
    });
}
