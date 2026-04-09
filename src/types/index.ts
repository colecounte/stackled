export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion?: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
}

export interface DependencyUpdate {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch';
}

export interface ChangelogEntry {
  version: string;
  content: string;
  url?: string;
}

export interface BreakingChange {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  type: 'major-version' | 'changelog-indicated' | 'api-removal' | 'behavior-change' | 'deprecation';
  affectedAPIs: string[];
}

export interface ImpactScore {
  packageName: string;
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  factors: string[];
  recommendation: string;
}

export interface AnalysisReport {
  timestamp: Date;
  totalDependencies: number;
  updatesAvailable: number;
  breakingChanges: BreakingChange[];
  impactScores: ImpactScore[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface StackledConfig {
  packageJsonPath?: string;
  ignoreDevDependencies?: boolean;
  severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
  outputFormat?: 'json' | 'table' | 'markdown';
}
