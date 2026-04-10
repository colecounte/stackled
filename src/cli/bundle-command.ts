import { Command } from 'commander';
import { fetchBundleSizes } from '../core/bundle-size-client';
import { analyzeBundleSizes, classifyBundleImpact, formatBytes } from '../core/bundle-size-analyzer';
import { parsePackageJson } from '../core/package-parser';
import * as path from 'path';

export function printBundleTable(result: ReturnType<typeof analyzeBundleSizes>): void {
  console.log('\n📦 Bundle Size Analysis\n');
  console.log(
    'Package'.padEnd(30) +
    'Version'.padEnd(12) +
    'Gzip'.padEnd(12) +
    'Minified'.padEnd(12) +
    'Impact'.padEnd(10) +
    'Treeshakeable'
  );
  console.log('─'.repeat(88));

  for (const entry of result.entries) {
    const impact = classifyBundleImpact(entry.gzip);
    const impactIcon = impact === 'high' ? '🔴' : impact === 'medium' ? '🟡' : '🟢';
    console.log(
      entry.name.padEnd(30) +
      entry.version.padEnd(12) +
      formatBytes(entry.gzip).padEnd(12) +
      formatBytes(entry.minified).padEnd(12) +
      `${impactIcon} ${impact}`.padEnd(10) +
      (entry.treeshakeable ? '✅' : '❌')
    );
  }

  console.log('─'.repeat(88));
  console.log(`Total: ${formatBytes(result.totalGzip)} gzip / ${formatBytes(result.totalMinified)} minified`);
  if (result.largestPackage) {
    console.log(`Largest: ${result.largestPackage.name} (${formatBytes(result.largestPackage.gzip)} gzip)`);
  }
  console.log();
}

export function registerBundleCommand(program: Command): void {
  program
    .command('bundle')
    .description('Analyze bundle sizes for your dependencies')
    .option('-p, --path <path>', 'Path to package.json', './package.json')
    .option('--top <n>', 'Show only top N largest packages', '20')
    .action(async (options) => {
      const pkgPath = path.resolve(options.path);
      const parsed = parsePackageJson(pkgPath);
      const deps = Object.entries(parsed.dependencies ?? {}).map(([name, version]) => ({
        name,
        version: (version as string).replace(/^[^\d]*/, ''),
      }));

      const topN = parseInt(options.top, 10);
      console.log(`Fetching bundle sizes for ${deps.length} packages...`);

      const entries = await fetchBundleSizes(deps.slice(0, topN));
      const sorted = entries.sort((a, b) => b.gzip - a.gzip);
      const result = analyzeBundleSizes(sorted);
      printBundleTable(result);
    });
}
