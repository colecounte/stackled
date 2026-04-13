import type { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser.js';
import { createRegistryClient } from '../core/registry-client.js';
import {
  buildFreshnessIndexEntry,
  buildFreshnessIndex,
  type FreshnessIndexEntry,
} from '../core/dependency-freshness-index.js';

const GRADE_ORDER = ['F', 'D', 'C', 'B', 'A'] as const;

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return chalk.green(grade);
    case 'B': return chalk.cyan(grade);
    case 'C': return chalk.yellow(grade);
    case 'D': return chalk.magenta(grade);
    default:  return chalk.red(grade);
  }
}

/**
 * Returns true if `grade` is at or below `threshold` in the A–F scale.
 * For example, isAtOrBelowGrade('C', 'B') => true (C is worse than B).
 */
function isAtOrBelowGrade(grade: string, threshold: string): boolean {
  return GRADE_ORDER.indexOf(grade as typeof GRADE_ORDER[number]) <=
         GRADE_ORDER.indexOf(threshold as typeof GRADE_ORDER[number]);
}

export function printFreshnessIndexTable(entries: FreshnessIndexEntry[]): void {
  if (entries.length === 0) {
    console.log(chalk.gray('No dependencies found.'));
    return;
  }
  const sorted = [...entries].sort((a, b) => a.freshnessScore - b.freshnessScore);
  console.log(
    chalk.bold(
      `${'Package'.padEnd(32)} ${'Current'.padEnd(12)} ${'Latest'.padEnd(12)} ${'Behind'.padEnd(8)} ${'Days'.padEnd(8)} Score  Grade`
    )
  );
  for (const e of sorted) {
    console.log(
      `${e.name.padEnd(32)} ${e.currentVersion.padEnd(12)} ${e.latestVersion.padEnd(12)} ${String(e.versionsBehind).padEnd(8)} ${String(e.daysSinceRelease).padEnd(8)} ${String(e.freshnessScore).padEnd(7)}${gradeColor(e.grade)}`
    );
  }
  const summary = buildFreshnessIndex(entries);
  console.log('');
  console.log(
    `Overall: ${gradeColor(summary.overallGrade)}  avg score ${summary.averageScore}  ` +
    `fresh ${chalk.green(summary.freshCount)}  stale ${chalk.red(summary.staleCount)}  total ${summary.totalPackages}`
  );
}

export function registerFreshnessIndexCommand(program: Command): void {
  program
    .command('freshness-index')
    .description('Score and rank all dependencies by how fresh they are')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--min-grade <grade>', 'Only show packages at or below this grade (e.g. C shows C, D, and F)')
    .action(async (opts) => {
      const deps = parsePackageJson(opts.path);
      const client = createRegistryClient();
      const entries: FreshnessIndexEntry[] = [];

      for (const dep of deps) {
        try {
          const info = await client.getPackageInfo(dep.name);
          const latestVersion = info['dist-tags']?.latest ?? dep.version;
          const availableVersions = Object.keys(info.versions ?? {});
          const publishedAt = new Date(info.time?.[latestVersion] ?? Date.now());
          entries.push(buildFreshnessIndexEntry(dep, latestVersion, availableVersions, publishedAt));
        } catch {
          // skip packages that fail to resolve
        }
      }

      const minGrade = opts.minGrade?.toUpperCase();
      const filtered = minGrade
        ? entries.filter(e => isAtOrBelowGrade(e.grade, minGrade))
        : entries;

      printFreshnessIndexTable(filtered);
    });
}
