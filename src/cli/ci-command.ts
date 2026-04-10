import { Command } from 'commander';
import { loadConfig } from '../core/config-manager';
import { evaluateThresholds, formatCiOutput } from '../core/ci-reporter';
import { scoreHealth } from '../core/health-scorer';
import { detectOutdated } from '../core/outdated-detector';
import { parsePackageJson } from '../core/package-parser';
import { HealthScore, CiReport } from '../types';

export function printCiSummary(report: CiReport): void {
  const icon = report.passed ? '✅' : '❌';
  console.log(`\n${icon} CI Health Check — ${report.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Score: ${report.overallScore} / 100`);
  console.log(`   Threshold: ${report.threshold}`);
  if (report.violations.length > 0) {
    console.log('\n  Violations:');
    for (const v of report.violations) {
      console.log(`    • ${v}`);
    }
  }
  if (report.warnings.length > 0) {
    console.log('\n  Warnings:');
    for (const w of report.warnings) {
      console.log(`    ~ ${w}`);
    }
  }
  console.log();
}

export function registerCiCommand(program: Command): void {
  program
    .command('ci')
    .description('Run a CI-mode health check and exit with non-zero code on failure')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('-t, --threshold <number>', 'Minimum passing score (0-100)', '70')
    .option('-f, --format <format>', 'Output format: text | json | github', 'text')
    .option('--fail-on-outdated', 'Fail if any outdated major versions are detected', false)
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const pkg = await parsePackageJson(opts.path);
        const threshold = parseInt(opts.threshold, 10);

        const scores: HealthScore[] = [];
        for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
          const score = await scoreHealth(name, String(version));
          scores.push(score);
        }

        const outdated = opts.failOnOutdated
          ? await detectOutdated(pkg)
          : { entries: [], total: 0, majorCount: 0, minorCount: 0, patchCount: 0 };

        const report = evaluateThresholds(scores, threshold, outdated, config);
        const output = formatCiOutput(report, opts.format);

        if (opts.format === 'text') {
          printCiSummary(report);
        } else {
          console.log(output);
        }

        process.exit(report.passed ? 0 : 1);
      } catch (err) {
        console.error('ci check failed:', (err as Error).message);
        process.exit(2);
      }
    });
}
