import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config-manager';
import { parsePackageJson } from '../core/package-parser';
import { analyzeDependencies } from '../core/dependency-analyzer';
import { buildDependencyGraph, getGraphStats, getTransitiveDependents } from '../core/dependency-graph';

function printGraphTree(roots: string[], nodes: Map<string, { name: string; dependencies: string[]; depth: number }>): void {
  const visited = new Set<string>();

  function printNode(name: string, indent: string): void {
    if (visited.has(name)) {
      console.log(`${indent}${chalk.gray(name)} ${chalk.dim('(circular)')}`);
      return;
    }
    visited.add(name);
    const node = nodes.get(name);
    if (!node) return;
    console.log(`${indent}${chalk.cyan(name)}`);
    for (const dep of node.dependencies) {
      printNode(dep, indent + '  ');
    }
  }

  for (const root of roots) {
    printNode(root, '');
  }
}

export function registerGraphCommand(program: Command): void {
  program
    .command('graph')
    .description('Visualize the dependency graph for your project')
    .option('-p, --package <path>', 'Path to package.json', 'package.json')
    .option('--focus <name>', 'Show dependents of a specific package')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const parsed = await parsePackageJson(options.package);
        const analyzed = await analyzeDependencies(parsed, config);
        const graph = buildDependencyGraph(analyzed);
        const stats = getGraphStats(graph);

        if (options.focus) {
          const dependents = getTransitiveDependents(graph, options.focus);
          if (dependents.length === 0) {
            console.log(chalk.yellow(`No dependents found for ${options.focus}`));
          } else {
            console.log(chalk.bold(`\nPackages depending on ${chalk.cyan(options.focus)}:`));
            for (const dep of dependents) {
              console.log(`  ${chalk.green('→')} ${dep}`);
            }
          }
          return;
        }

        console.log(chalk.bold('\nDependency Graph\n'));
        printGraphTree(graph.roots, graph.nodes);

        console.log(chalk.dim(`\n─────────────────────────────`));
        console.log(`Total packages : ${chalk.cyan(stats.totalNodes)}`);
        console.log(`Max depth      : ${chalk.cyan(stats.maxDepth)}`);
        console.log(`Root packages  : ${chalk.cyan(stats.rootCount)}`);
      } catch (err) {
        console.error(chalk.red('Error building dependency graph:'), (err as Error).message);
        process.exit(1);
      }
    });
}
