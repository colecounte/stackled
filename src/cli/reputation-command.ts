import { Command } from 'commander';
import chalk from 'chalk';
import {
  buildReputationEntry,
  summarizeReputation,
  ReputationEntry,
} from '../core/dependency-reputation-checker';
import { createRegistryClient } from '../core/registry-client';
import { parsePackageJson } from '../core/package-parser';

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return chalk.green(grade);
    case 'B': return chalk.cyan(grade);
    case 'C': return chalk.yellow(grade);
    case 'D': return chalk.magenta(grade);
    default:  return chalk.red(grade);
  }
}

export function printReputationTable(entries: ReputationEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)} ${'Downloads/wk'.padStart(14)} ${'Stars'.padStart(8)} ${'Score'.padStart(6)} ${'Grade'.padStart(6)} Flags`
    )
  );
  console.log('─'.repeat(80));

  for (const e of entries) {
    const downloads = e.weeklyDownloads.toLocaleString().padStart(14);
    const stars = (e.stars !== null ? e.stars.toLocaleString() : '—').padStart(8);
    const score = String(e.score).padStart(6);
    const grade = gradeColor(e.grade).padStart(6);
    const flags = e.flags.length ? chalk.dim(e.flags.join(', ')) : '';
    console.log(`${e.name.padEnd(30)} ${downloads} ${stars} ${score} ${grade} ${flags}`);
  }

  const summary = summarizeReputation(entries);
  console.log('─'.repeat(80));
  console.log(
    `\nTotal: ${summary.total}  ` +
    chalk.green(`High: ${summary.highReputation}`) + '  ' +
    chalk.red(`Low: ${summary.lowReputation}`) + '  ' +
    chalk.dim(`Unknown: ${summary.unknown}`) + '\n'
  );
}

export function registerReputationCommand(program: Command): void {
  program
    .command('reputation [package-json]')
    .description('Check the community reputation of your dependencies')
    .option('--min-grade <grade>', 'Only show packages at or below this grade', 'F')
    .action(async (packageJsonPath: string = 'package.json', opts) => {
      try {
        const packages = await parsePackageJson(packageJsonPath);
        const client = createRegistryClient();
        const entries: ReputationEntry[] = [];

        for (const pkg of packages) {
          const info = await client.getPackageInfo(pkg.name);
          const downloads = (info as any)?.downloads ?? 0;
          const repo = (info as any)?.repository ?? {};
          entries.push(
            buildReputationEntry(
              pkg,
              downloads,
              repo.stars ?? null,
              repo.forks ?? null,
              repo.openIssues ?? null
            )
          );
        }

        const grades = ['A', 'B', 'C', 'D', 'F'];
        const minIdx = grades.indexOf((opts.minGrade as string).toUpperCase());
        const filtered = entries.filter(
          (e) => grades.indexOf(e.grade) >= minIdx
        );

        printReputationTable(filtered);
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
