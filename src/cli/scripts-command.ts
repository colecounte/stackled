import { Command } from 'commander';
import chalk from 'chalk';
import { auditScripts, summarizeScriptsAudit, ScriptsAuditResult, ScriptRisk } from '../core/scripts-auditor';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';

const riskColor = (risk: ScriptRisk): string => {
  if (risk === 'dangerous') return chalk.red(risk);
  if (risk === 'suspicious') return chalk.yellow(risk);
  return chalk.green(risk);
};

export function printScriptsReport(results: ScriptsAuditResult[]): void {
  const flagged = results.filter((r) => r.hasDangerousScripts || r.hasSuspiciousScripts);

  if (flagged.length === 0) {
    console.log(chalk.green('✔ No suspicious or dangerous scripts found.'));
    return;
  }

  for (const result of flagged) {
    console.log(`\n${chalk.bold(result.package)}`);
    for (const script of result.scripts) {
      if (script.risk === 'safe') continue;
      console.log(
        `  ${chalk.cyan(script.name.padEnd(20))} ${riskColor(script.risk).padEnd(12)} ${chalk.gray(script.command)}`
      );
      if (script.reason) {
        console.log(`  ${' '.repeat(20)} ${chalk.dim('→')} ${script.reason}`);
      }
    }
  }

  const summary = summarizeScriptsAudit(results);
  console.log(`\n${chalk.bold('Summary:')}`);
  console.log(`  Dangerous : ${chalk.red(String(summary.dangerous))}`);
  console.log(`  Suspicious: ${chalk.yellow(String(summary.suspicious))}`);
  console.log(`  Safe      : ${chalk.green(String(summary.safe))}`);
}

export function registerScriptsCommand(program: Command): void {
  program
    .command('scripts')
    .description('Audit lifecycle scripts in your dependencies for suspicious or dangerous patterns')
    .option('--all', 'Show all packages including safe ones', false)
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const packageJson = await parsePackageJson(config.packageJsonPath ?? 'package.json');
        const client = createRegistryClient();

        const deps = Object.keys({
          ...(packageJson.dependencies ?? {}),
          ...(packageJson.devDependencies ?? {}),
        });

        const packages = await Promise.all(
          deps.map(async (name) => {
            const info = await client.getPackageInfo(name);
            return { name, packageJson: info };
          })
        );

        const results = auditScripts(packages);
        const toShow = opts.all ? results : results.filter((r) => r.hasDangerousScripts || r.hasSuspiciousScripts);
        printScriptsReport(toShow);
      } catch (err) {
        console.error(chalk.red('Failed to audit scripts:'), (err as Error).message);
        process.exit(1);
      }
    });
}
