export interface Dependency {
  name: string;
  version: string;
  type?: 'dependency' | 'devDependency' | 'peerDependency';
}

export interface ParsedPackage {
  name: string;
  version: string;
  dependencies: Dependency[];
}

export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  repository?: string;
  weeklyDownloads?: number;
  deprecated?: string;
  maintainers?: Array<{ name: string; email?: string }>;
  time?: Record<string, string>;
  versions?: Record<string, unknown>;
  peerDependencies?: Record<string, string>;
  license?: string;
}

export interface BreakingChange {
  package: string;
  fromVersion: string;
  toVersion: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ImpactScore {
  package: string;
  score: number;
  reasons: string[];
}

export interface OutdatedEntry {
  package: string;
  current: string;
  latest: string;
  updateType: 'major' | 'minor' | 'patch';
}

export interface VulnerabilitySummary {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  total: number;
}

export interface MaintainerStatus {
  package: string;
  lastPublish: string;
  daysSinceLastPublish: number;
  isAbandoned: boolean;
  maintainerCount: number;
}

export interface TrendResult {
  package: string;
  trend: 'growing' | 'stable' | 'declining';
  releaseFrequency: 'high' | 'medium' | 'low';
  averageDaysBetweenReleases: number;
}

export interface PackageHealth {
  package: string;
  score: number;
  grade: string;
}
