import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { checkPeerDependencies, PeerDependencyIssue } from '../core/peer-dependency-checker';
import { ParsedPackage } from '../types/index';

function printPeerTable(issues: PeerDependencyIssue[]): void {
  console.log(chalk.bold('\nPeer Dependency Issues:\n'));
  for (const issue of issues) {
    const status = issue.missing
      ? chalk.red('MISSING')
      : chalk.yellow('INCOMPATIBLE');
    const installed = issue.installed ?? chalk.gray('not installed');
    console.log(
      `  ${chalk.cyan(issue.package)} requires ${chalk.white(issue.peerDep)}@${chalk.white(issue.required)}`
    );
    console.log(`    Installed: ${installed}  [${status}]\n`);
  }
}

function printPeerSummary(missing: number, incompatible: number): void {
  if (missing === 0 && incompatible === 0) {
    console.log(chalk.green('✔ All peer dependencies are satisfied.'));
    return;
  }
  if (missing > 0) {
    console.log(chalk.red(`✖ ${missing} missing peer dependenc${missing === 1 ? 'y' : 'ies'}`));
  }
  if (incompatible > 0) {
    console.log(chalk.yellow(`⚠ ${incompatible} incompatible peer dependenc${incompatible === 1 ? 'y' : 'ies'}`));
  }
}

export function registerPeerCommand(program: Command): void {
  program
    .command('peer')
    .description('Check peer dependency compatibility across installed packages')
    .option('-p, --path <path>', 'Path to package.json', './package.json')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const parsed: ParsedPackage = await parsePackageJson(options.path);

        const allDeps = {
          ...parsed.dependencies,
          ...parsed.devDependencies,
        } as Record<string, string>;

        // Build installed map by stripping semver range prefixes for simplicity
        const installedMap: Record<string, string> = {};
        for (const [name, ver] of Object.entries(allDeps)) {
          const clean = ver.replace(/^[^0-9]*/, '');
          installedMap[name] = clean;
        }

        const report = checkPeerDependencies([parsed], installedMap);

        if (config.output === 'json') {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        if (report.hasIssues) {
          printPeerTable(report.issues);
        }
        printPeerSummary(report.missingCount, report.incompatibleCount);

        process.exitCode = report.hasIssues ? 1 : 0;
      } catch (err) {
        console.error(chalk.red('Error checking peer dependencies:'), (err as Error).message);
        process.exitCode = 1;
      }
    });
}
