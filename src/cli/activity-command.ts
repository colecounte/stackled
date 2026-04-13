import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { checkDependencyActivity, summarizeActivity, ActivityEntry } from '../core/dependency-activity-checker';
import { createRegistryClient } from '../core/registry-client';

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return chalk.green(grade);
    case 'B': return chalk.cyan(grade);
    case 'C': return chalk.yellow(grade);
    case 'D': return chalk.magenta(grade);
    default:  return chalk.red(grade);
  }
}

export function printActivityTable(entries: ActivityEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.gray('No packages to display.'));
    return;
  }

  const col = [30, 10, 16, 10, 10, 7, 6];
  const header = [
    'Package'.padEnd(col[0]),
    'Version'.padEnd(col[1]),
    'Last Commit'.padEnd(col[2]),
    'Open Issues'.padEnd(col[3]),
    'Resolution%'.padEnd(col[4]),
    'Stars'.padEnd(col[5]),
    'Grade',
  ].join('  ');

  console.log(chalk.bold(header));
  console.log('─'.repeat(header.length));

  for (const e of entries) {
    const lastCommit = e.lastCommitDaysAgo !== null ? `${e.lastCommitDaysAgo}d ago` : 'unknown';
    const resolution = e.issueResolutionRate !== null
      ? `${Math.round(e.issueResolutionRate * 100)}%`
      : 'n/a';
    const stars = e.stars !== null ? String(e.stars) : 'n/a';
    const open = e.openIssues !== null ? String(e.openIssues) : 'n/a';

    console.log([
      e.name.slice(0, col[0]).padEnd(col[0]),
      e.version.padEnd(col[1]),
      lastCommit.padEnd(col[2]),
      open.padEnd(col[3]),
      resolution.padEnd(col[4]),
      stars.padEnd(col[5]),
      gradeColor(e.activityGrade),
    ].join('  '));

    if (e.flags.length > 0) {
      console.log(chalk.gray(`  ⚑ ${e.flags.join(', ')}`.slice(0, 80)));
    }
  }
}

export function registerActivityCommand(program: Command): void {
  program
    .command('activity')
    .description('Analyze community activity and engagement for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--min-grade <grade>', 'Only show packages at or below this grade')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const parsed = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const packages = await Promise.all(
        parsed.dependencies.map(d => client.fetchPackageInfo(d.name).catch(() => null))
      );
      const valid = packages.filter(Boolean) as any[];
      const entries = checkDependencyActivity(valid);

      const grades = ['A','B','C','D','F'];
      const filtered = opts.minGrade
        ? entries.filter(e => grades.indexOf(e.activityGrade) >= grades.indexOf(opts.minGrade.toUpperCase()))
        : entries;

      if (opts.json) {
        console.log(JSON.stringify({ entries: filtered, summary: summarizeActivity(filtered) }, null, 2));
        return;
      }

      printActivityTable(filtered);
      const summary = summarizeActivity(filtered);
      console.log();
      console.log(chalk.bold('Summary:'), `${summary.total} packages | ${summary.healthy} healthy | ${summary.inactive} inactive | avg score ${summary.averageScore}`);
    });
}
