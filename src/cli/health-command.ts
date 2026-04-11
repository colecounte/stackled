import { Command } from 'commander';
import chalk from 'chalk';
import { parsePackageJson } from '../core/package-parser';
import { checkMaintainers } from '../core/maintainer-checker';
import { summarizeVulnerabilities } from '../core/vulnerability-scanner';
import { detectOutdated } from '../core/outdated-detector';
import { computeHealthScore, HealthScore, HealthGrade } from '../core/health-scorer';

const gradeColor: Record<HealthGrade, (s: string) => string> = {
  A: chalk.green,
  B: chalk.greenBright,
  C: chalk.yellow,
  D: chalk.red,
  F: chalk.redBright,
};

/** Valid health grades in descending order (best to worst). */
const GRADES_ORDERED: HealthGrade[] = ['A', 'B', 'C', 'D', 'F'];

/**
 * Returns true if `grade` is at or below (worse than or equal to) `threshold`.
 * For example, isAtOrBelowGrade('C', 'B') === true because C is worse than B.
 */
function isAtOrBelowGrade(grade: HealthGrade, threshold: HealthGrade): boolean {
  return GRADES_ORDERED.indexOf(grade) >= GRADES_ORDERED.indexOf(threshold);
}

export function printHealthTable(scores: HealthScore[]): void {
  console.log(
    chalk.bold(`\n${'Package'.padEnd(30)} ${'Score'.padEnd(7)} ${'Grade'.padEnd(6)} ${'Maint'.padEnd(6)} ${'Sec'.padEnd(6)} ${'Fresh'.padEnd(6)} Pop`)
  );
  console.log('─'.repeat(75));
  for (const s of scores) {
    const color = gradeColor[s.grade];
    console.log(
      `${s.package.padEnd(30)} ${String(s.score).padEnd(7)} ${color(s.grade.padEnd(6))} ` +
      `${String(s.breakdown.maintenance).padEnd(6)} ${String(s.breakdown.security).padEnd(6)} ` +
      `${String(s.breakdown.freshness).padEnd(6)} ${s.breakdown.popularity}`
    );
  }
  console.log();
}

export function registerHealthCommand(program: Command): void {
  program
    .command('health [path]')
    .description('Score the overall health of your dependencies')
    .option('-f, --filter <grade>', 'Show only packages at or below grade (A/B/C/D/F)')
    .action(async (pkgPath: string = '.', options: { filter?: string }) => {
      try {
        const filterGrade = options.filter?.toUpperCase() as HealthGrade | undefined;
        if (filterGrade && !GRADES_ORDERED.includes(filterGrade)) {
          console.error(chalk.red(`Invalid grade filter "${options.filter}". Must be one of: A, B, C, D, F`));
          process.exit(1);
        }

        const parsed = await parsePackageJson(pkgPath);
        const names = parsed.dependencies.map((d) => d.name);

        const [maintainers, vulnMap, outdatedList] = await Promise.all([
          checkMaintainers(names),
          summarizeVulnerabilities(pkgPath),
          detectOutdated(parsed.dependencies),
        ]);

        const outdatedMap = new Map(outdatedList.map((o) => [o.package, o]));
        const maintainerMap = new Map(maintainers.map((m) => [m.package, m]));

        const scores: HealthScore[] = names.map((name) =>
          computeHealthScore(
            name,
            maintainerMap.get(name) ?? { package: name, lastPublish: '', daysSinceLastPublish: 0, isAbandoned: false, maintainerCount: 1 },
            vulnMap[name] ?? { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
            outdatedMap.get(name) ?? null,
            0
          )
        );

        const filtered = filterGrade
          ? scores.filter((s) => isAtOrBelowGrade(s.grade, filterGrade))
          : scores;

        filtered.sort((a, b) => a.score - b.score);
        printHealthTable(filtered);
      } catch (err) {
        console.error(chalk.red('Error running health check:'), (err as Error).message);
        process.exit(1);
      }
    });
}
