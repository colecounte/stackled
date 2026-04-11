export type DependencyType = 'production' | 'development' | 'peer' | 'optional';

export interface DependencyInfo {
  name: string;
  version: string;
  type: DependencyType;
  resolved?: string;
  description?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
}

export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  license?: string;
  repository?: { url?: string; type?: string };
  homepage?: string;
  deprecated?: string;
  versions?: Record<string, RegistryPackage>;
  time?: Record<string, string>;
  maintainers?: Array<{ name: string; email?: string }>;
  funding?: unknown;
  engines?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dist?: { unpackedSize?: number; tarball?: string; integrity?: string };
  _npmUser?: { name: string; email?: string };
}

export interface BreakingChange {
  version: string;
  description: string;
  type: 'api' | 'behavior' | 'dependency' | 'unknown';
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  body: string;
  breakingChanges: BreakingChange[];
}

export interface DependencyReport {
  dependency: DependencyInfo;
  latestVersion?: string;
  changelog: ChangelogEntry[];
  breakingChanges: BreakingChange[];
  impactScore: number;
  recommendation: string;
}

export interface ScanReport {
  scannedAt: string;
  packagePath: string;
  dependencies: DependencyReport[];
  summary: {
    total: number;
    withBreakingChanges: number;
    highImpact: number;
  };
}

export interface StackledConfig {
  outputFormat: 'table' | 'json' | 'markdown';
  ignorePackages: string[];
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  registryUrl: string;
  ciMode: boolean;
  minHealthScore?: number;
}

export interface VulnerabilityInfo {
  id: string;
  title: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  url?: string;
  range?: string;
  fixedIn?: string;
}

export interface ScanResult {
  package: string;
  version: string;
  vulnerabilities: VulnerabilityInfo[];
  highestSeverity: 'none' | 'low' | 'moderate' | 'high' | 'critical';
}

export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  risk: 'low' | 'medium' | 'high';
  osiApproved: boolean;
  copyleft: boolean;
}

export interface OutdatedEntry {
  name: string;
  current: string;
  latest: string;
  updateType: 'major' | 'minor' | 'patch' | 'none';
  isOutdated: boolean;
}
