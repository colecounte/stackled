import { Command } from 'commander';
import chalk from 'chalk';
import { runNpmAudit, mapToVulnerabilities } from '../core/npm-audit-bridge.js';
import { Vulnerability } from '../types/index.js';

const severityColor = (s: string): string => {
  switch (s) {
    case 'critical': return chalk.bgRed.white(s);
    case 'high':     return chalk.red(s);
    case 'medium':   return chalk.yellow(s);
    default:         return chalk.gray(s);
  }
};

export function printNpmAuditTable(vulns: Vulnerability[]): void {
  if (vulns.length === 0) {
    console.log(chalk.green('✔ No vulnerabilities found via npm audit.'));
    return;
  }

  console.log(chalk.bold(`\n${'Title'.padEnd(40)} ${'Severity'.padEnd(10)} ${'Fix'.padEnd(6)} URL`));
  console.log('─'.repeat(100));

  for (const v of vulns) {
    const fix = v.fixAvailable ? chalk.green('yes') : chalk.red('no');
    console.log(
      `${v.title.slice(0, 39).padEnd(40)} ${severityColor(v.severity).padEnd(10)} ${fix.padEnd(6)} ${v.url}`
    );
  }

  const critical = vulns.filter((v) => v.severity === 'critical').length;
  const high     = vulns.filter((v) => v.severity === 'high').length;
  const medium   = vulns.filter((v) => v.severity === 'medium').length;

  console.log(
    `\n${chalk.bold('Summary:')} ${vulns.length} vulnerability(ies) — ` +
    `${chalk.red(`${critical} critical`)} / ${chalk.red(`${high} high`)} / ${chalk.yellow(`${medium} medium`)}`
  );
}

export function registerNpmAuditCommand(program: Command): void {
  program
    .command('npm-audit')
    .description('Run npm audit and display vulnerabilities in a formatted table')
    .option('--cwd <path>', 'Path to the project directory', process.cwd())
    .option('--min-severity <level>', 'Minimum severity to display (low|medium|high|critical)', 'low')
    .action((opts: { cwd: string; minSeverity: string }) => {
      const severityOrder = ['low', 'medium', 'moderate', 'high', 'critical'];
      const minIdx = severityOrder.indexOf(opts.minSeverity);

      console.log(chalk.cyan(`Running npm audit in ${opts.cwd}...`));
      const result = runNpmAudit(opts.cwd);
      let vulns = mapToVulnerabilities(result);

      if (minIdx > 0) {
        vulns = vulns.filter((v) => severityOrder.indexOf(v.severity) >= minIdx);
      }

      printNpmAuditTable(vulns);

      if (result.totalVulnerabilities > 0) {
        process.exitCode = 1;
      }
    });
}
