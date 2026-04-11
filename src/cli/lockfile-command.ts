import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { auditLockfile, LockfileAuditResult } from '../core/lockfile-auditor';
import { parsePackageJson } from '../core/package-parser';

export function printLockfileReport(result: LockfileAuditResult): void {
  console.log(chalk.bold(`\nLockfile Audit — type: ${chalk.cyan(result.lockfileType)}\n`));

  if (result.lockfileType === 'unknown') {
    console.log(chalk.yellow('⚠  No supported lockfile found. Run npm install, yarn, or pnpm install first.'));
    return;
  }

  if (result.lockfileType !== 'npm') {
    console.log(chalk.yellow(`ℹ  Full audit is currently supported for npm lockfiles only.`));
    return;
  }

  console.log(`  Total locked packages : ${chalk.bold(result.totalEntries)}`);
  console.log(`  Missing integrity     : ${result.missingIntegrity.length > 0 ? chalk.red(result.missingIntegrity.length) : chalk.green(0)}`);
  console.log(`  Version mismatches    : ${result.mismatchedVersions.length > 0 ? chalk.red(result.mismatchedVersions.length) : chalk.green(0)}\n`);

  if (result.missingIntegrity.length > 0) {
    console.log(chalk.red.bold('Packages missing integrity hash:'));
    for (const name of result.missingIntegrity) {
      console.log(`  ${chalk.red('✗')} ${name}`);
    }
    console.log();
  }

  if (result.mismatchedVersions.length > 0) {
    console.log(chalk.yellow.bold('Version mismatches (declared vs resolved):'));
    for (const m of result.mismatchedVersions) {
      console.log(`  ${chalk.yellow('!')} ${chalk.bold(m.name)}  declared: ${m.declared}  resolved: ${m.resolved}`);
    }
    console.log();
  }

  if (result.missingIntegrity.length === 0 && result.mismatchedVersions.length === 0) {
    console.log(chalk.green('✔  Lockfile looks healthy — no issues detected.'));
  }
}

export function registerLockfileCommand(program: Command): void {
  program
    .command('lockfile')
    .description('Audit your lockfile for missing integrity hashes and version mismatches')
    .option('-d, --dir <path>', 'Project directory', process.cwd())
    .action(async (opts: { dir: string }) => {
      const dir = path.resolve(opts.dir);
      try {
        const { dependencies } = await parsePackageJson(path.join(dir, 'package.json'));
        const result = auditLockfile(dir, dependencies);
        printLockfileReport(result);
        if (result.missingIntegrity.length > 0 || result.mismatchedVersions.length > 0) {
          process.exitCode = 1;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Error: ${msg}`));
        process.exit(1);
      }
    });
}
