export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface DependencyInfo {
  name: string;
  version: string;
  currentVersion: string;
  latestVersion: string;
  repository?: string;
  homepage?: string;
}

export interface DependencyUpdate {
  name: string;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch';
  breaking: boolean;
}

export interface AnalysisResult {
  totalDependencies: number;
  outdatedDependencies: number;
  breakingChanges: number;
  updates: DependencyUpdate[];
}

export interface BreakingChange {
  packageName: string;
  version: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  affectedAPIs?: string[];
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  changes: string[];
  breaking: boolean;
}

export interface StackledConfig {
  include?: string[];
  exclude?: string[];
  breakingChangeThreshold?: 'major' | 'minor' | 'patch';
  autofix?: boolean;
  notifications?: {
    email?: string;
    slack?: string;
  };
}

export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies';

export interface ParsedDependency {
  name: string;
  version: string;
  type: DependencyType;
}
