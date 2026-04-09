import * as fs from 'fs/promises';
import * as path from 'path';

export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ParsedDependency {
  name: string;
  version: string;
  isDev: boolean;
}

export class PackageParser {
  /**
   * Reads and parses package.json from the given directory
   * @param projectPath - Path to the project directory
   * @returns Parsed package.json object
   */
  async readPackageJson(projectPath: string): Promise<PackageJson> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content) as PackageJson;
      
      if (!packageJson.name || !packageJson.version) {
        throw new Error('Invalid package.json: missing name or version');
      }
      
      return packageJson;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`package.json not found at ${packageJsonPath}`);
      }
      throw error;
    }
  }

  /**
   * Extracts all dependencies from package.json
   * @param packageJson - Parsed package.json object
   * @returns Array of parsed dependencies
   */
  extractDependencies(packageJson: PackageJson): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];

    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        dependencies.push({ name, version, isDev: false });
      });
    }

    if (packageJson.devDependencies) {
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        dependencies.push({ name, version, isDev: true });
      });
    }

    return dependencies;
  }

  /**
   * Parses project dependencies from a given path
   * @param projectPath - Path to the project directory
   * @returns Array of parsed dependencies
   */
  async parseDependencies(projectPath: string): Promise<ParsedDependency[]> {
    const packageJson = await this.readPackageJson(projectPath);
    return this.extractDependencies(packageJson);
  }
}
