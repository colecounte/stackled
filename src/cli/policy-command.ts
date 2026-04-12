import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { checkSecurityPolicy, PolicyViolation, SecurityPolicy } from '../core/security-policy-checker';
import { Dependency } from '../types';

function printPolicyReport(violations: PolicyViolation[], passed: boolean): void {
  if (violations.length === 0) {
    console.log(chalk.green('✔ All dependencies satisfy the security policy.'));
    return;
  }

  console.log(chalk.bold('\nPolicy Violations:\n'));
  for (const v of violations) {
    const icon = v.severity === 'error' ? chalk.red('✖') : chalk.yellow('⚠');
    const label = chalk.bold(`${v.package}@${v.version}`);
    const rule = chalk.gray(`[${v.rule}]`);
    console.log(`  ${icon} ${label} ${rule}`);
    console.log(`     ${v.message}`);
  }

  console.log();
  if (passed) {
    console.log(chalk.yellow(`Warnings: ${violations.length}`));
  } else {
    const errors = violations.filter((v) => v.severity === 'error').length;
    const warnings = violations.filter((v) => v.severity === 'warning').length;
    console.log(chalk.red(`Errors: ${errors}`) + '  ' + chalk.yellow(`Warnings: ${warnings}`));
  }
}

export function registerPolicyCommand(program: Command): void {
  program
    .command('policy')
    .description('Check dependencies against your security policy')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--allowed-licenses <licenses>', 'Comma-separated list of allowed licenses')
    .option('--block-deprecated', 'Fail on deprecated packages', false)
    .option('--block-unmaintained', 'Warn on unmaintained packages', false)
    .option('--unmaintained-days <days>', 'Days threshold for unmaintained', '365')
    .option('--json', 'Output as JSON', false)
    .action(async (opts) => {
      try {
        const pkgJson = parsePackageJson(opts.path);
        const config = loadConfig();

        const policy: SecurityPolicy = {
          allowedLicenses: opts.allowedLicenses
            ? opts.allowedLicenses.split(',').map((l: string) => l.trim())
            : (config as any).allowedLicenses,
          blockDeprecated: opts.blockDeprecated || (config as any).blockDeprecated,
          blockUnmaintained: opts.blockUnmaintained || (config as any).blockUnmaintained,
          unmaintainedThresholdDays: parseInt(opts.unmaintainedDays, 10),
        };

        const allDeps: Dependency[] = Object.entries({
          ...(pkgJson.dependencies ?? {}),
          ...(pkgJson.devDependencies ?? {}),
        }).map(([name, version]) => ({
          name,
          version: version as string,
          currentVersion: version as string,
          latestVersion: version as string,
          updateType: 'none',
        } as Dependency));

        const result = checkSecurityPolicy(allDeps, policy);

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          printPolicyReport(result.violations, result.passed);
        }

        if (!result.passed) process.exit(1);
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
