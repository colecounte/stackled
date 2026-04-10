export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer' | 'optional';
  resolved?: string;
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
  dist?: {
    tarball?: string;
    shasum?: string;
    attestations?: {
      url: string;
      type: string;
    };
  };
  repository?: string | { type: string; url: string };
  license?: string;
  funding?: string | { type: string; url: string } | Array<{ type: string; url: string }>;
  engines?: Record<string, string>;
  maintainers?: Array<{ name: string; email?: string }>;
  deprecated?: string;
  time?: Record<string, string>;
  'dist-tags'?: Record<string, string>;
  versions?: Record<string, RegistryPackage>;
}

export interface BreakingChange {
  version: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DependencyReport {
  dependency: Dependency;
  latestVersion: string;
  breakingChanges: BreakingChange[];
  impactScore: number;
  recommendation: string;
}

export interface ScanReport {
  generatedAt: string;
  totalDependencies: number;
  outdatedCount: number;
  breakingChangesCount: number;
  highImpactCount: number;
  dependencies: DependencyReport[];
}

export interface StackledConfig {
  outputFormat: 'table' | 'json' | 'markdown';
  ignorePackages: string[];
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  registryUrl: string;
  ciFailOnHighRisk: boolean;
  ciScoreThreshold: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMinutes: number;
}

export interface NotificationPayload {
  title: string;
  summary: string;
  details: string[];
  severity: 'info' | 'warning' | 'error' | 'critical';
  packageName: string;
  fromVersion: string;
  toVersion: string;
}

export type UpdateType = 'major' | 'minor' | 'patch' | 'none';

export interface UpdateInfo {
  dependency: Dependency;
  latestVersion: string;
  updateType: UpdateType;
  isBreaking: boolean;
}
