export interface Dependency {
  name: string;
  currentVersion: string;
  versionRange: string;
  isDev: boolean;
}

export interface PackageMetadata {
  name: string;
  latestVersion: string;
  versions: string[];
  publishedAt?: Date;
  description: string;
  repositoryUrl?: string;
  npmUrl: string;
}

export interface UpdateInfo {
  dependency: Dependency;
  metadata: PackageMetadata;
  updateType: 'major' | 'minor' | 'patch' | 'none';
  latestVersion: string;
}

export interface BreakingChange {
  version: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AnalysisResult {
  dependency: Dependency;
  updateInfo: UpdateInfo;
  breakingChanges: BreakingChange[];
  impactScore: number;
  recommendation: string;
}

export interface Report {
  generatedAt: Date;
  projectName: string;
  totalDependencies: number;
  outdatedCount: number;
  criticalCount: number;
  results: AnalysisResult[];
}

export interface StackledConfig {
  outputFormat: 'table' | 'json' | 'markdown';
  includeDev: boolean;
  severityThreshold: 'high' | 'medium' | 'low';
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  ignorePackages: string[];
}

export type UpdateType = 'major' | 'minor' | 'patch' | 'none';
