import { RegistryPackageInfo } from '../types';

export interface ReleaseNote {
  version: string;
  date: string | null;
  body: string;
  isBreaking: boolean;
  hasSecurity: boolean;
}

export interface ReleaseNotesResult {
  packageName: string;
  notes: ReleaseNote[];
  totalReleases: number;
  hasBreakingChanges: boolean;
  hasSecurityFixes: boolean;
}

const BREAKING_PATTERNS = /breaking change|breaking:|BREAKING/i;
const SECURITY_PATTERNS = /security|cve-|vulnerability|vuln|patch.*security/i;

export function parseReleaseNote(version: string, body: string, date: string | null): ReleaseNote {
  return {
    version,
    date,
    body: body.trim(),
    isBreaking: BREAKING_PATTERNS.test(body),
    hasSecurity: SECURITY_PATTERNS.test(body),
  };
}

export function extractReleaseNotes(
  packageInfo: RegistryPackageInfo,
  fromVersion?: string,
): ReleaseNotesResult {
  const versions = packageInfo.versions ?? {};
  const time = (packageInfo as Record<string, unknown>).time as Record<string, string> | undefined;

  const notes: ReleaseNote[] = Object.keys(versions)
    .filter((v) => {
      if (!fromVersion) return true;
      const from = fromVersion.replace(/^[^0-9]*/, '');
      return v > from;
    })
    .map((v) => {
      const meta = versions[v] as Record<string, unknown>;
      const body = (meta?.description as string) ?? '';
      const date = time?.[v] ?? null;
      return parseReleaseNote(v, body, date);
    })
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

  return {
    packageName: packageInfo.name,
    notes,
    totalReleases: notes.length,
    hasBreakingChanges: notes.some((n) => n.isBreaking),
    hasSecurityFixes: notes.some((n) => n.hasSecurity),
  };
}

export function formatReleaseNotesSummary(result: ReleaseNotesResult): string {
  const lines: string[] = [`Release notes for ${result.packageName} (${result.totalReleases} releases)`];
  if (result.hasBreakingChanges) lines.push('  ⚠ Contains breaking changes');
  if (result.hasSecurityFixes) lines.push('  🔒 Contains security fixes');
  for (const note of result.notes.slice(0, 5)) {
    const date = note.date ? ` (${note.date.slice(0, 10)})` : '';
    lines.push(`  ${note.version}${date}: ${note.body.slice(0, 80) || '(no description)'}`);
  }
  return lines.join('\n');
}
