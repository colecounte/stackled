import { PackageJson } from './package-parser';

export interface DependencyInfo {
  name: string;
  currentVersion: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
}

export interface AnalysisResult {
  totalDependencies: number;
  productionDependencies: number;
  devDependencies: number;
  peerDependencies: number;
  dependencies: DependencyInfo[];
}

export class DependencyAnalyzer {
  /**
   * Analyzes a package.json and extracts all dependency information
   */
  analyze(packageJson: PackageJson): AnalysisResult {
    const dependencies: DependencyInfo[] = [];

    // Extract production dependencies
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          currentVersion: version,
          type: 'dependencies',
        });
      });
    }

    // Extract dev dependencies
    if (packageJson.devDependencies) {
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          currentVersion: version,
          type: 'devDependencies',
        });
      });
    }

    // Extract peer dependencies
    if (packageJson.peerDependencies) {
      Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          currentVersion: version,
          type: 'peerDependencies',
        });
      });
    }

    const prodCount = packageJson.dependencies ? Object.keys(packageJson.dependencies).length : 0;
    const devCount = packageJson.devDependencies ? Object.keys(packageJson.devDependencies).length : 0;
    const peerCount = packageJson.peerDependencies ? Object.keys(packageJson.peerDependencies).length : 0;

    return {
      totalDependencies: dependencies.length,
      productionDependencies: prodCount,
      devDependencies: devCount,
      peerDependencies: peerCount,
      dependencies,
    };
  }

  /**
   * Filters dependencies by type
   */
  filterByType(
    dependencies: DependencyInfo[],
    type: 'dependencies' | 'devDependencies' | 'peerDependencies'
  ): DependencyInfo[] {
    return dependencies.filter((dep) => dep.type === type);
  }

  /**
   * Finds a specific dependency by name
   */
  findDependency(dependencies: DependencyInfo[], name: string): DependencyInfo | undefined {
    return dependencies.find((dep) => dep.name === name);
  }
}
