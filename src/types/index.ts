export interface Dependency {
  name: string;
  version: string;
  isDev: boolean;
  isOptional?: boolean;
}

export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface BreakingChange {
  version: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  affectedApis?: string[];
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  changes: string[];
  breakingChanges: BreakingChange[];
}

export interface UpdateInfo {
  isOutdated: boolean;
  latestVersion: string;
  updateType?: 'major' | 'minor' | 'patch';
}

export interface DependencyAnalysis {
  dependency: Dependency;
  changelog: ChangelogEntry[];
  breakingChanges: BreakingChange[];
  impactScore: number;
  recommendation: string;
  updateInfo?: UpdateInfo;
}

export interface Report {
  generatedAt: string;
  totalDependencies: number;
  outdatedCount: number;
  breakingChangesCount: number;
  highImpactCount: number;
  analyses: DependencyAnalysis[];
}

export interface StackledConfig {
  packageJsonPath: string;
  includeDevDependencies: boolean;
  minImpactScore: number;
  outputFormat: 'json' | 'table' | 'markdown';
}
