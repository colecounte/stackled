import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { detectWorkspaces, WorkspacePackage } from '../core/workspace-detector';

function printWorkspaceTable(packages: WorkspacePackage[]): void {
  const nameW = Math.max(20, ...packages.map(p => p.name.length));
  const verW = 10;
  const depW = 12;

  const header =
    chalk.bold('Package'.padEnd(nameW)) +
    '  ' +
    chalk.bold('Version'.padEnd(verW)) +
    '  ' +
    chalk.bold('Deps'.padEnd(depW));

  console.log(header);
  console.log('─'.repeat(nameW + verW + depW + 6));

  for (const pkg of packages) {
    const depCount = Object.keys(pkg.dependencies).length;
    const row =
      chalk.cyan(pkg.name.padEnd(nameW)) +
      '  ' +
      pkg.version.padEnd(verW) +
      '  ' +
      String(depCount).padEnd(depW);
    console.log(row);
  }
}

export function registerWorkspaceCommand(program: Command): void {
  program
    .command('workspace')
    .description('Detect and list packages in a monorepo workspace')
    .option('--cwd <dir>', 'Root directory to scan', process.cwd())
    .option('--json', 'Output as JSON')
    .action((opts: { cwd: string; json?: boolean }) => {
      const rootDir = path.resolve(opts.cwd);
      const info = detectWorkspaces(rootDir);

      if (opts.json) {
        console.log(JSON.stringify(info, null, 2));
        return;
      }

      if (!info.isMonorepo) {
        console.log(chalk.yellow('No workspace/monorepo detected in:'), rootDir);
        return;
      }

      console.log(
        chalk.bold(`\nWorkspace detected (${info.type}) — ${info.packages.length} package(s)\n`)
      );
      printWorkspaceTable(info.packages);
      console.log(
        `\n${chalk.green('✔')} Root: ${chalk.dim(info.root)}\n`
      );
    });
}
