import { Command } from 'commander';
import chalk from 'chalk';
import {
  checkDependencyContributors,
  summarizeContributors,
  ContributorEntry,
} from '../core/dependency-contributor-checker';
import { loadConfig } from '../core/config-manager';
import { parsePackage } from '../core/package-parser';

function riskColor(risk: ContributorEntry['risk']): string {
  switch (risk) {
    case 'low': return chalk.green(risk);
    case 'medium': return chalk.yellow(risk);
    case 'high': return chalk.red(risk);
  }
}

export function printContributorTable(entries: ContributorEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(32)} ${'Version'.padEnd(10)} ${'Contributors'.padEnd(14)} ${'Top Contributor'.padEnd(22)} ${'Org'.padEnd(6)} Risk`
    )
  );
  console.log('─'.repeat(95));

  for (const entry of entries) {
    const org = entry.isOrgBacked ? chalk.cyan('yes') : chalk.gray('no');
    const top = (entry.topContributor ?? chalk.gray('unknown')).padEnd(22);
    console.log(
      `${entry.name.padEnd(32)} ${entry.version.padEnd(10)} ${String(entry.contributorCount).padEnd(14)} ${top} ${org.padEnd(6)} ${riskColor(entry.risk)}`
    );
    if (entry.flags.length > 0) {
      console.log(chalk.gray(`  flags: ${entry.flags.join(', ')}`) );
    }
  }
}

export function registerContributorCommand(program: Command): void {
  program
    .command('contributors')
    .description('Analyze contributor counts and risk for dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--high-only', 'Show only high-risk packages')
    .action(async (opts) => {
      const config = await loadConfig();
      const parsed = await parsePackage(opts.path);
      const allDeps = {
        ...parsed.dependencies,
        ...parsed.devDependencies,
      };

      const packages = Object.entries(allDeps).map(([name, version]) => ({
        name,
        version: version as string,
        description: '',
        dependencies: {},
        devDependencies: {},
      })) as any[];

      // In real usage this would fetch from registry; stub empty for CLI wiring
      const contributorMap: Record<string, Array<{ name: string }>> = {};
      const entries = checkDependencyContributors(packages, contributorMap);
      const filtered = opts.highOnly ? entries.filter((e) => e.risk === 'high') : entries;

      printContributorTable(filtered);

      const summary = summarizeContributors(entries);
      console.log(`\nTotal: ${summary.total}  Low: ${chalk.green(summary.lowRisk)}  Medium: ${chalk.yellow(summary.mediumRisk)}  High: ${chalk.red(summary.highRisk)}`);

      if (summary.highRisk > 0 && config.output !== 'json') {
        process.exitCode = 1;
      }
    });
}
