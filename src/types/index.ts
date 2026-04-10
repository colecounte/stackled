export type UpdateType = 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low';
export type OutputFormat = 'table' | 'json' | 'minimal';

export interface PackageInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  latestVersion?: string;
  updateType?: UpdateType;
}

export interface BreakingChange {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ImpactScore {
  packageName: string;
  score: number;
  reasons: string[];
}

export interface DependencyReport {
  packages: PackageInfo[];
  breakingChanges: BreakingChange[];
  impactScores: ImpactScore[];
  generatedAt: string;
}

export interface StackledConfig {
  outputFormat: OutputFormat;
  ignorePackages: string[];
  checkDevDependencies: boolean;
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  registryUrl: string;
}

export interface VulnerabilityReport {
  totalPackagesScanned: number;
  vulnerablePackages: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  results: import('../core/vulnerability-scanner').ScanResult[];
}

export interface NotificationPayload {
  title: string;
  summary: string;
  details: string[];
  severity: VulnerabilitySeverity | 'info';
}
