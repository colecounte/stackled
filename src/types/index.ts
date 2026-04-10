export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion?: string;
  description?: string;
  repositoryUrl?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  licenses?: string[];
}

export interface OutdatedDependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  versionDiff: string;
  isStable: boolean;
  updateAvailable: boolean;
}

export interface BreakingChange {
  dependency: string;
  fromVersion: string;
  toVersion: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImpactScore {
  dependency: string;
  score: number;
  factors: string[];
}

export interface ScanReport {
  scannedAt: string;
  totalDependencies: number;
  outdated: OutdatedDependency[];
  breakingChanges: BreakingChange[];
  impactScores: ImpactScore[];
}

export interface StackledConfig {
  outputFormat: 'table' | 'json' | 'markdown';
  ignorePackages: string[];
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
}
