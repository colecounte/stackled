import { Command } from 'commander';
import chalk from 'chalk';
import { verifySignatures, summarizeSignatures, SignatureEntry } from '../core/dependency-signature-verifier';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';

function statusColor(status: string): string {
  switch (status) {
    case 'verified': return chalk.green(status);
    case 'unverified': return chalk.yellow(status);
    case 'missing': return chalk.red(status);
    case 'invalid': return chalk.bgRed.white(status);
    default: return status;
  }
}

function riskColor(risk: string): string {
  if (risk === 'high') return chalk.red(risk);
  if (risk === 'medium') return chalk.yellow(risk);
  return chalk.green(risk);
}

export function printSignatureTable(entries: SignatureEntry[]): void {
  console.log(
    chalk.bold(
      `\n${'Package'.padEnd(30)} ${'Version'.padEnd(12)} ${'Status'.padEnd(12)} ${'Provenance'.padEnd(11)} ${'Sigstore'.padEnd(10)} Risk`
    )
  );
  console.log('─'.repeat(90));
  for (const e of entries) {
    const provenance = e.hasProvenance ? chalk.green('yes') : chalk.red('no');
    const sigstore = e.hasSigstore ? chalk.green('yes') : chalk.red('no');
    console.log(
      `${e.name.padEnd(30)} ${e.version.padEnd(12)} ${statusColor(e.status).padEnd(20)} ${provenance.padEnd(19)} ${sigstore.padEnd(18)} ${riskColor(e.riskLevel)}`
    );
    if (e.flags.length > 0) {
      console.log(chalk.gray(`  flags: ${e.flags.join(', ')}`))
    }
  }
}

export function registerSignatureCommand(program: Command): void {
  program
    .command('signature')
    .description('Verify package signatures and provenance for dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--high-risk-only', 'Show only high-risk packages')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const { dependencies } = await parsePackageJson(opts.path);
        const client = createRegistryClient(config);

        const metas: Record<string, Record<string, unknown>> = {};
        await Promise.all(
          dependencies.map(async (dep) => {
            try {
              const data = await client.getPackageInfo(dep.name);
              metas[dep.name] = (data as Record<string, unknown>);
            } catch {
              metas[dep.name] = {};
            }
          })
        );

        let entries = verifySignatures(dependencies, metas);
        if (opts.highRiskOnly) {
          entries = entries.filter((e) => e.riskLevel === 'high');
        }

        printSignatureTable(entries);

        const summary = summarizeSignatures(entries);
        console.log(`\n${chalk.bold('Summary:')} ${summary.verified} verified, ${summary.unverified} unverified, ${summary.missing} missing, ${summary.invalid} invalid — ${chalk.red(`${summary.highRisk} high risk`)}`);

        if (summary.highRisk > 0) process.exit(1);
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });
}
