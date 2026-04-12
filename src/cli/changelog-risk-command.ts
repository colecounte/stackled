import { Command } from 'commander';
import chalk from 'chalk';
import { scoreChangelogRisks, ChangelogRiskScore } from '../core/changelog-risk-scorer';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { fetchChangelog } from '../core/changelog-fetcher';
import { summarizeChangelog } from '../core/changelog-summarizer';

const gradeColor = (grade: string): string => {
  switch (grade) {
    case 'A': return chalk.green(grade);
    case 'B': return chalk.cyan(grade);
    case 'C': return chalk.yellow(grade);
    case 'D': return chalk.magenta(grade);
    default:  return chalk.red(grade);
  }
};

export function printRiskTable(scores: ChangelogRiskScore[]): void {
  if (scores.length === 0) {
    console.log(chalk.gray('No changelog risk data available.'));
    return;
  }

  console.log('');
  console.log(chalk.bold('Changelog Risk Scores'));
  console.log(chalk.gray('─'.repeat(70)));
  console.log(
    chalk.bold('Package'.padEnd(30)) +
    chalk.bold('Version'.padEnd(12)) +
    chalk.bold('Score'.padEnd(8)) +
    chalk.bold('Grade'.padEnd(8)) +
    chalk.bold('Top Factor')
  );
  console.log(chalk.gray('─'.repeat(70)));

  for (const entry of scores) {
    const topFactor = entry.factors[0] ?? chalk.gray('none');
    console.log(
      entry.package.padEnd(30) +
      entry.version.padEnd(12) +
      String(entry.score).padEnd(8) +
      gradeColor(entry.grade).padEnd(8) +
      chalk.gray(topFactor)
    );
  }

  console.log(chalk.gray('─'.repeat(70)));
  console.log('');
}

export function registerChangelogRiskCommand(program: Command): void {
  program
    .command('changelog-risk')
    .description('Score changelog risk for each dependency based on breaking changes and security fixes')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--json', 'Output results as JSON')
    .action(async (opts) => {
      const config = await loadConfig();
      const packages = await parsePackageJson(opts.path);

      const entries: Parameters<typeof scoreChangelogRisks>[0] = [];

      for (const pkg of packages) {
        try {
          const changelog = await fetchChangelog(pkg, config);
          const summary = summarizeChangelog(changelog);
          entries.push({ package: pkg.name, version: pkg.version, summary });
        } catch {
          // skip packages with no changelog
        }
      }

      const scores = scoreChangelogRisks(entries);

      if (opts.json) {
        console.log(JSON.stringify(scores, null, 2));
      } else {
        printRiskTable(scores);
      }
    });
}
