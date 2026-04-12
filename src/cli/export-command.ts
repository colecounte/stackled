import { Command } from 'commander';
import * as path from 'path';
import { loadConfig } from '../core/config-manager';
import { aggregateScorecard } from '../core/scorecard-aggregator';
import { parsePackageJson } from '../core/package-parser';
import { exportReport, ExportFormat } from '../core/export-reporter';
import chalk from 'chalk';

const SUPPORTED_FORMATS: ExportFormat[] = ['json', 'csv', 'markdown'];

function isExportFormat(value: string): value is ExportFormat {
  return SUPPORTED_FORMATS.includes(value as ExportFormat);
}

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export dependency scorecard to a file')
    .option('-f, --format <format>', 'Output format: json | csv | markdown', 'json')
    .option('-o, --output <path>', 'Output file path', './stackled-report')
    .option('--title <title>', 'Report title (markdown only)', 'Dependency Scorecard')
    .option('-p, --package <path>', 'Path to package.json', './package.json')
    .action(async (opts) => {
      const format = opts.format as string;
      if (!isExportFormat(format)) {
        console.error(chalk.red(`Unsupported format "${format}". Choose from: ${SUPPORTED_FORMATS.join(', ')}`));
        process.exit(1);
      }

      const extensions: Record<ExportFormat, string> = {
        json: '.json',
        csv: '.csv',
        markdown: '.md',
      };

      const outputPath = opts.output.endsWith(extensions[format])
        ? opts.output
        : `${opts.output}${extensions[format]}`;

      try {
        const pkg = parsePackageJson(opts.package);
        const config = loadConfig();
        const entries = await aggregateScorecard(pkg.dependencies ?? {}, config);

        exportReport(entries, {
          format,
          outputPath: path.resolve(outputPath),
          title: opts.title,
        });

        console.log(chalk.green(`✔ Report exported to ${path.resolve(outputPath)}`));
        console.log(chalk.gray(`  Format : ${format}`));
        console.log(chalk.gray(`  Entries: ${entries.length}`));
      } catch (err) {
        console.error(chalk.red('Export failed:'), (err as Error).message);
        process.exit(1);
      }
    });
}
