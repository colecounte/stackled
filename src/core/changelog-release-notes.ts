import { PackageInfo } from '../types';

export interface ReleaseNote {
  version: string;
  date?: string;
  title?: string;
  body: string;
  isBreaking: boolean;
  isSecurityFix: boolean;
}

export interface ReleaseNotesSummary {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  notes: ReleaseNote[];
  totalReleases: number;
  hasBreakingChanges: boolean;
  hasSecurityFixes: boolean;
}

export function parseReleaseNote(raw: Record<string, unknown>): ReleaseNote {
  const body = String(raw['body'] ?? raw['description'] ?? '');
  const isBreaking =
    /breaking[\s-]change|BREAKING/i.test(body) ||
    /^#+\s*v?\d+\.\d+\.\d+.*breaking/im.test(body);
  const isSecurityFix =
    /security|cve-\d{4}/i.test(body) ||
    /fix.*vuln|patch.*security/i.test(body);

  return {
    version: String(raw['version'] ?? raw['tag_name'] ?? ''),
    date: raw['published_at'] ? String(raw['published_at']) : undefined,
    title: raw['name'] ? String(raw['name']) : undefined,
    body,
    isBreaking,
    isSecurityFix,
  };
}

export function extractReleaseNotes(
  releases: Record<string, unknown>[],
  fromVersion: string,
  toVersion: string
): ReleaseNote[] {
  return releases
    .map(parseReleaseNote)
    .filter((n) => n.version && n.version !== fromVersion)
    .slice(0, 20);
}

export function formatReleaseNotesSummary(
  pkg: PackageInfo,
  notes: ReleaseNote[]
): ReleaseNotesSummary {
  return {
    packageName: pkg.name,
    currentVersion: pkg.currentVersion,
    latestVersion: pkg.latestVersion,
    notes,
    totalReleases: notes.length,
    hasBreakingChanges: notes.some((n) => n.isBreaking),
    hasSecurityFixes: notes.some((n) => n.isSecurityFix),
  };
}
