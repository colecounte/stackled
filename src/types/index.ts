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
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
  updateAvailable?: boolean;
  updateType?: 'major' | 'minor' | 'patch' | 'none';
  npmMetadata?: Record<string, unknown>;
}

export interface BreakingChange {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImpactScore {
  packageName: string;
  score: number;
  factors: string[];
}

export interface DeprecationWarning {
  packageName: string;
  currentVersion: string;
  message: string;
  successor?: string;
}

export interface Report {
  generatedAt: string;
  totalDependencies: number;
  outdatedCount: number;
  breakingChanges: BreakingChange[];
  impactScores: ImpactScore[];
  deprecations: DeprecationWarning[];
  recommendations: string[];
}

export interface Config {
  outputFormat: 'json' | 'table' | 'markdown';
  ignorePackages: string[];
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  checkDeprecations: boolean;
  cacheTtlMinutes: number;
}
