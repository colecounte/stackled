import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { analyzeSentiment, summarizeSentiment, SentimentLevel, SentimentEntry } from '../core/dependency-sentiment-analyzer';
import { createRegistryClient } from '../core/registry-client';

function levelColor(level: SentimentLevel): string {
  switch (level) {
    case 'positive': return chalk.green(level);
    case 'neutral': return chalk.blue(level);
    case 'negative': return chalk.yellow(level);
    case 'critical': return chalk.red(level);
  }
}

export function printSentimentTable(entries: SentimentEntry[]): void {
  console.log(
    chalk.bold('Package'.padEnd(30)),
    chalk.bold('Version'.padEnd(12)),
    chalk.bold('Score'.padEnd(8)),
    chalk.bold('Sentiment'.padEnd(12)),
    chalk.bold('Signals'),
  );
  console.log('─'.repeat(90));
  for (const entry of entries) {
    console.log(
      entry.name.padEnd(30),
      entry.version.padEnd(12),
      String(entry.score).padEnd(8),
      levelColor(entry.level).padEnd(20),
      entry.signals.join(', ') || chalk.gray('none'),
    );
  }
}

export function registerSentimentCommand(program: Command): void {
  program
    .command('sentiment')
    .description('Analyze community sentiment signals for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--min-score <n>', 'Only show entries at or below this score', parseInt)
    .action(async (opts) => {
      const pkgJson = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const packages = await Promise.all(
        Object.keys(pkgJson.dependencies ?? {}).map(name => client.getPackageInfo(name)),
      );
      let entries = analyzeSentiment(packages);
      if (opts.minScore !== undefined) {
        entries = entries.filter(e => e.score <= opts.minScore);
      }
      entries.sort((a, b) => a.score - b.score);
      printSentimentTable(entries);
      const summary = summarizeSentiment(entries);
      console.log();
      console.log(chalk.bold('Summary:'));
      console.log(`  Total: ${summary.total}`);
      console.log(`  ${chalk.green('Positive:')} ${summary.positive}`);
      console.log(`  ${chalk.blue('Neutral:')} ${summary.neutral}`);
      console.log(`  ${chalk.yellow('Negative:')} ${summary.negative}`);
      console.log(`  ${chalk.red('Critical:')} ${summary.critical}`);
      console.log(`  Average Score: ${summary.averageScore}`);
    });
}
