import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { checkSizeBudgets, summarizeBudgets, BudgetEntry } from '../core/dependency-size-budget';
import { loadConfig } from '../core/config-manager';

function statusColor(status: BudgetEntry['status']): string {
  switch (status) {
    case 'ok': return chalk.green('ok');
    case 'warning': return chalk.yellow('warning');
    case 'exceeded': return chalk.red('exceeded');
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function printBudgetTable(entries: BudgetEntry[]): void {
  console.log(
    chalk.bold(
      `${'Package'.padEnd(30)} ${'Size'.padStart(10)} ${'Budget'.padStart(10)} ${'Used%'.padStart(7)} Status`,
    ),
  );
  console.log('─'.repeat(75));
  for (const e of entries) {
    const pct = `${e.percentUsed}%`;
    console.log(
      `${e.name.padEnd(30)} ${formatBytes(e.sizeBytes).padStart(10)} ${formatBytes(e.budgetBytes).padStart(10)} ${pct.padStart(7)} ${statusColor(e.status)}`,
    );
  }
}

export function registerBudgetCommand(program: Command): void {
  program
    .command('budget')
    .description('Check dependency bundle sizes against configured budgets')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--default-budget <bytes>', 'Default size budget in bytes', '51200')
    .option('--warn-threshold <fraction>', 'Warning threshold (0-1)', '0.8')
    .option('--only-violations', 'Show only warning/exceeded entries')
    .action(async (opts) => {
      const config = await loadConfig();
      const packageJson = parsePackageJson(opts.path);
      const deps = Object.entries({
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }).map(([name, version]) => ({
        name,
        currentVersion: String(version).replace(/^[^\d]*/, ''),
        latestVersion: String(version).replace(/^[^\d]*/, ''),
        type: 'production' as const,
      }));

      // In production this would call a bundle-size API; here we use a stub
      const sizeMap: Record<string, number> = {};

      const budgetConfig = {
        defaultBudgetBytes: parseInt(opts.defaultBudget, 10),
        overrides: (config as any).budgetOverrides ?? {},
        warningThreshold: parseFloat(opts.warnThreshold),
      };

      let entries = checkSizeBudgets(deps, sizeMap, budgetConfig);
      if (opts.onlyViolations) {
        entries = entries.filter((e) => e.status !== 'ok');
      }

      if (entries.length === 0) {
        console.log(chalk.green('All dependencies are within budget.'));
        return;
      }

      printBudgetTable(entries);
      const summary = summarizeBudgets(entries);
      console.log();
      console.log(
        `Summary: ${chalk.green(summary.ok + ' ok')}  ${chalk.yellow(summary.warning + ' warning')}  ${chalk.red(summary.exceeded + ' exceeded')}`,
      );

      if (summary.exceeded > 0) process.exit(1);
    });
}
