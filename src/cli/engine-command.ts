import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeEngineCompatibility } from '../core/engine-compatibility-checker';
import { loadConfig } from '../core/config-manager';
import type { EngineCompatibilityResult } from '../types';

function printEngineTable(results: EngineCompatibilityResult[]): void {
  if (results.length === 0) {
    console.log(chalk.green('✓ All dependencies are compatible with the current Node.js version.'));
    return;
  }

  console.log('');
  console.log(chalk.bold('Engine Compatibility Report'));
  console.log('─'.repeat(72));

  const header = [
    'Package'.padEnd(28),
    'Required'.padEnd(16),
    'Current'.padEnd(12),
    'Status',
  ].join(' ');
  console.log(chalk.dim(header));
  console.log('─'.repeat(72));

  for (const r of results) {
    const statusLabel = r.compatible
      ? chalk.green('✓ compatible')
      : chalk.red('✗ incompatible');

    const required = (r.requiredRange ?? 'unspecified').padEnd(16);
    const current = r.currentVersion.padEnd(12);
    const name = r.packageName.padEnd(28);

    console.log(`${name} ${required} ${current} ${statusLabel}`);

    if (!r.compatible && r.message) {
      console.log(chalk.dim(`  ${r.message}`));
    }
  }

  console.log('─'.repeat(72));

  const incompatible = results.filter((r) => !r.compatible);
  if (incompatible.length > 0) {
    console.log(
      chalk.red(
        `\n${incompatible.length} incompatible package(s) detected. Update Node.js or pin compatible versions.`
      )
    );
  } else {
    console.log(chalk.green('\nAll packages are engine-compatible.'));
  }
}

export function registerEngineCommand(program: Command): void {
  program
    .command('engine')
    .description('Check Node.js engine compatibility for all dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--fail-on-incompatible', 'Exit with code 1 if incompatibilities are found', false)
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const results = await analyzeEngineCompatibility(opts.path, config);

        printEngineTable(results);

        if (opts.failOnIncompatible && results.some((r) => !r.compatible)) {
          process.exit(1);
        }
      } catch (err) {
        console.error(chalk.red('Error running engine check:'), (err as Error).message);
        process.exit(1);
      }
    });
}
