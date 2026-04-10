export interface DependencyInfo {
  name: string;
  current: string;
  latest: string;
  latestStable: string;
  updateType: 'major' | 'minor' | 'patch' | 'none';
  hasBreakingChanges: boolean;
  vulnerabilities: VulnerabilityEntry[];
  deprecated?: boolean;
  deprecationMessage?: string;
  successor?: string;
  repositoryUrl?: string;
  license?: string;
  weeklyDownloads?: number;
  publishedAt?: string;
  maintainers?: string[];
  peerDependencies?: Record<string, string>;
  bundleSize?: number;
  versions?: string[];
}

export interface VulnerabilityEntry {
  id: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  url?: string;
}

export interface BreakingChange {
  version: string;
  description: string;
  source: 'changelog' | 'commit' | 'inferred';
}

export interface ImpactScore {
  name: string;
  score: number;
  factors: string[];
}

export interface HealthScore {
  name: string;
  overall: number;
  grade: string;
  maintenance: number;
  security: number;
  freshness: number;
  popularity: number;
}

export interface StackledConfig {
  outputFormat: 'table' | 'json' | 'markdown';
  ignorePackages: string[];
  severityThreshold: 'low' | 'moderate' | 'high' | 'critical';
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  registry: string;
  ci?: {
    failOnVulnerabilities: boolean;
    failOnOutdated: boolean;
    minHealthScore: number;
  };
}

export interface OutdatedEntry {
  name: string;
  current: string;
  latest: string;
  updateType: 'major' | 'minor' | 'patch';
}

export interface LicenseEntry {
  name: string;
  license: string;
  risk: 'low' | 'medium' | 'high';
  osiApproved: boolean;
  copyleft: boolean;
}

export interface PeerIssue {
  package: string;
  peer: string;
  required: string;
  installed: string | null;
  compatible: boolean;
}

export interface BundleSizeEntry {
  name: string;
  bytes: number;
  gzip: number;
  impact: 'small' | 'medium' | 'large';
}
