import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { createRegistryClient } from '../core/registry-client';
import { linkDependencyChangelogs, ChangelogLink } from '../core/dependency-changelog-linker';
import { PackageInfo } from '../types';

function printLinkTable(links: ChangelogLink[]): void {
  const colW = { name: 30, version: 10, changelog: 7, url: 50 };
  const header =
    'Package'.padEnd(colW.name) +
    'Version'.padEnd(colW.version) +
    'Changelog'.padEnd(colW.changelog + 2) +
    'URL';
  console.log(chalk.bold(header));
  console.log('─'.repeat(100));
  for (const link of links) {
    const hasIcon = link.hasChangelog ? chalk.green('✔') : chalk.red('✘');
    const displayUrl = link.changelogUrl ?? chalk.dim(link.npmUrl);
    const truncated =
      displayUrl.length > colW.url ? displayUrl.slice(0, colW.url - 3) + '...' : displayUrl;
    console.log(
      link.name.padEnd(colW.name) +
        link.version.padEnd(colW.version) +
        (hasIcon + '        ').slice(0, colW.changelog + 2) +
        truncated
    );
  }
}

export function registerChangelogLinkCommand(program: Command): void {
  program
    .command('changelog-links')
    .description('Show changelog links for all dependencies')
    .option('-p, --path <path>', 'Path to package.json', 'package.json')
    .option('--no-coverage', 'Hide coverage summary')
    .action(async (opts) => {
      const parsed = parsePackageJson(opts.path);
      const packages: PackageInfo[] = parsed.dependencies.map((d) => ({
        name: d.name,
        version: d.version,
        currentVersion: d.version,
        latestVersion: d.version,
      }));

      const client = createRegistryClient();
      const repoMap: Record<string, string | null> = {};
      for (const pkg of packages) {
        try {
          const info = await client.getPackageInfo(pkg.name);
          repoMap[pkg.name] = info.repositoryUrl ?? null;
        } catch {
          repoMap[pkg.name] = null;
        }
      }

      const result = linkDependencyChangelogs(packages, repoMap);
      printLinkTable(result.links);

      if (opts.coverage !== false) {
        console.log();
        console.log(
          chalk.bold('Coverage: ') +
            `${result.withChangelog}/${result.links.length} packages have changelogs ` +
            chalk.cyan(`(${result.coveragePercent}%)`)
        );
      }
    });
}
