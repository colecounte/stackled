import chalk from 'chalk';
import { Command } from 'commander';
import { checkDependencyAuthors, summarizeAuthors, AuthorEntry } from '../core/dependency-author-checker';
import { createRegistryClient } from '../core/registry-client';
import { parsePackageJson } from '../core/package-parser';

const riskColor = (risk: string): string => {
  if (risk === 'high') return chalk.red(risk);
  if (risk === 'medium') return chalk.yellow(risk);
  return chalk.green(risk);
};

export function printAuthorTable(entries: AuthorEntry[]): void {
  const col1 = 30;
  const col2 = 10;
  const col3 = 8;
  const col4 = 12;
  const col5 = 10;

  console.log(
    chalk.bold('Package'.padEnd(col1)) +
    chalk.bold('Author'.padEnd(col2)) +
    chalk.bold('Maint.'.padEnd(col3)) +
    chalk.bold('Repo'.padEnd(col4)) +
    chalk.bold('Risk'.padEnd(col5)),
  );
  console.log('─'.repeat(col1 + col2 + col3 + col4 + col5));

  for (const e of entries) {
    const author = (e.authorName ?? '—').substring(0, col2 - 2).padEnd(col2);
    const maint = String(e.maintainerCount).padEnd(col3);
    const repo = (e.hasRepository ? '✓' : '✗').padEnd(col4);
    const risk = riskColor(e.risk);
    console.log(`${e.name.padEnd(col1)}${author}${maint}${repo}${risk}`);
  }
}

export function printAuthorSummary(entries: AuthorEntry[]): void {
  const summary = summarizeAuthors(entries);
  console.log(`\nTotal: ${summary.total}  High: ${chalk.red(summary.high)}  Medium: ${chalk.yellow(summary.medium)}  Low: ${chalk.green(summary.low)}`);
}

export function registerAuthorCommand(program: Command): void {
  program
    .command('author')
    .description('Check author and maintainer health of dependencies')
    .option('--json', 'Output as JSON')
    .option('--risk <level>', 'Filter by risk level (low|medium|high)')
    .action(async (opts) => {
      const pkg = parsePackageJson(process.cwd());
      const client = createRegistryClient();
      const deps = await Promise.all(
        Object.entries(pkg.dependencies ?? {}).map(async ([name, version]) => {
          const info = await client.getPackageInfo(name);
          return { name, version: String(version), packageInfo: info };
        }),
      );
      let entries = checkDependencyAuthors(deps as any);
      if (opts.risk) entries = entries.filter((e) => e.risk === opts.risk);

      if (opts.json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
      }

      printAuthorTable(entries);
      printAuthorSummary(entries);
    });
}
