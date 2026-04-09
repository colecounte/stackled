/**
 * Shared type definitions for stackled
 */

export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: any;
}

export interface DependencyHealth {
  name: string;
  currentVersion: string;
  latestVersion?: string;
  isOutdated: boolean;
  hasBreakingChanges: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface BreakingChange {
  package: string;
  fromVersion: string;
  toVersion: string;
  description: string;
  affectedAPIs?: string[];
  migrationGuide?: string;
}

export interface StackledConfig {
  projectPath: string;
  includeDevDependencies: boolean;
  ignoredPackages?: string[];
  severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
  autoUpdate?: boolean;
}

export interface AnalysisReport {
  timestamp: Date;
  projectName: string;
  totalDependencies: number;
  outdatedDependencies: number;
  breakingChanges: BreakingChange[];
  healthScore: number;
  recommendations: string[];
}

export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies';

export interface VersionRange {
  raw: string;
  operator?: '^' | '~' | '>=' | '<=' | '>' | '<' | '=';
  version: string;
}
