export type UpdateType = 'major' | 'minor' | 'patch' | 'none';

export type BreakingChangeSeverity = 'high' | 'medium' | 'low';

export type BreakingChangeType = 'api' | 'behavior' | 'dependency' | 'config' | 'other';

export interface BreakingChange {
  type: BreakingChangeType;
  description: string;
  severity: BreakingChangeSeverity;
}

export interface ParsedPackage {
  name: string;
  version: string;
  isDev: boolean;
}

export interface DependencyAnalysis {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: UpdateType;
  changelogUrl?: string;
}

export interface DependencyReport {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: UpdateType;
  breakingChanges: BreakingChange[];
  recommendation: string;
}

export interface ImpactScore {
  score: number;
  factors: string[];
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  body: string;
}

export interface StackledConfig {
  ignore?: string[];
  includeDev?: boolean;
  minImpactScore?: number;
  outputFormat?: 'text' | 'json';
}
