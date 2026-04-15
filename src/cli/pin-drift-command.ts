import chalk from 'chalk';
import type { Command } from 'commander';
import { parsePackageJson } from '../core/package-parser.js';
import { detectPinDrift, summarizePinDrift } from '../core/dependency-pin-drift-detector.js';
import type { PinDriftEntry, PinDriftLevel } from '../core/dependency-pin-drift-detector.js';
import { createRegistryClient } from '../core/registry-client.js';

function driftColor(level: PinDriftLevel): string {
  switch (level) {
    case 'severe': return chalk.red(level);
    case 'moderate': return chalk.yellow(level);
    case 'minor': return chalk.cyan(level);
    default: return chalk.green(level);
  }
}

export function printPinDriftTable(entries: PinDriftEntry[]): void {
  const header = [
    'Package'.padEnd(30),
    'Specifier'.padEnd(16),
    'Resolved'.padEnd(12),
    'Behind'.padEnd(8),
    'Drift'.padEnd(10),
    'Pinned',
  ].join(' ');
  console.log(chalk.bold(header));
  console.log('─'.repeat(90));
  for (const e of entries) {
    const row = [
      e.name.padEnd(30),
      e.specifier.padEnd(16),
      e.resolvedVersion.padEnd(12),
      String(e.versionsBehind).padEnd(8),
      driftColor(e.driftLevel).padEnd(10),
      e.isPinned ? chalk.green('yes') : chalk.gray('no'),
    ].join(' ');
    console.log(row);
  }
}

export function registerPinDriftCommand(program: Command): void {
  program
    .command('pin-drift')
    .description('Detect version drift in pinned and ranged dependencies')
    .option('--severe-only', 'Show only severely drifted packages')
    .action(async (opts) => {
      const pkg = parsePackageJson(process.cwd());
      const client = createRegistryClient();
      const resolvedMap: Record<string, string> = {};
      const availableMap: Record<string, string[]> = {};

      for (const dep of pkg.dependencies) {
        try {
          const info = await client.getPackageInfo(dep.name);
          resolvedMap[dep.name] = info.version;
          availableMap[dep.name] = Object.keys(info.versions ?? {});
        } catch {
          resolvedMap[dep.name] = dep.version;
          availableMap[dep.name] = [];
        }
      }

      let entries = detectPinDrift(pkg.dependencies, resolvedMap, availableMap);
      if (opts.severeOnly) {
        entries = entries.filter((e) => e.driftLevel === 'severe');
      }

      printPinDriftTable(entries);
      const summary = summarizePinDrift(entries);
      console.log();
      console.log(chalk.bold(`Total: ${summary.total}  Pinned: ${summary.pinned}  Drifted: ${summary.drifted}  Severe: ${summary.severeCount}`));
    });
}
