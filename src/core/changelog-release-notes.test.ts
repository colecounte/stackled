import { parseReleaseNote, extractReleaseNotes, formatReleaseNotesSummary } from './changelog-release-notes';
import { RegistryPackageInfo } from '../types';

function makePackageInfo(overrides: Partial<RegistryPackageInfo> = {}): RegistryPackageInfo {
  return {
    name: 'my-lib',
    version: '2.0.0',
    description: 'A test library',
    versions: {
      '1.0.0': { description: 'Initial release' },
      '1.1.0': { description: 'Added new feature' },
      '2.0.0': { description: 'BREAKING CHANGE: removed old API' },
    },
    ...overrides,
  } as unknown as RegistryPackageInfo;
}

describe('parseReleaseNote', () => {
  it('detects breaking changes', () => {
    const note = parseReleaseNote('2.0.0', 'BREAKING CHANGE: removed foo', '2024-01-01');
    expect(note.isBreaking).toBe(true);
    expect(note.hasSecurity).toBe(false);
  });

  it('detects security fixes', () => {
    const note = parseReleaseNote('1.0.1', 'Patched security vulnerability CVE-2024-1234', '2024-02-01');
    expect(note.hasSecurity).toBe(true);
    expect(note.isBreaking).toBe(false);
  });

  it('handles neutral release', () => {
    const note = parseReleaseNote('1.1.0', 'Added new feature', null);
    expect(note.isBreaking).toBe(false);
    expect(note.hasSecurity).toBe(false);
    expect(note.date).toBeNull();
  });
});

describe('extractReleaseNotes', () => {
  it('returns all releases when no fromVersion given', () => {
    const info = makePackageInfo();
    const result = extractReleaseNotes(info);
    expect(result.totalReleases).toBe(3);
    expect(result.packageName).toBe('my-lib');
  });

  it('filters releases after fromVersion', () => {
    const info = makePackageInfo();
    const result = extractReleaseNotes(info, '1.0.0');
    expect(result.notes.every((n) => n.version > '1.0.0')).toBe(true);
  });

  it('detects breaking changes in result', () => {
    const info = makePackageInfo();
    const result = extractReleaseNotes(info);
    expect(result.hasBreakingChanges).toBe(true);
  });

  it('returns empty notes when no versions', () => {
    const info = makePackageInfo({ versions: {} } as never);
    const result = extractReleaseNotes(info);
    expect(result.totalReleases).toBe(0);
    expect(result.hasBreakingChanges).toBe(false);
    expect(result.hasSecurityFixes).toBe(false);
  });
});

describe('formatReleaseNotesSummary', () => {
  it('includes package name and release count', () => {
    const info = makePackageInfo();
    const result = extractReleaseNotes(info);
    const summary = formatReleaseNotesSummary(result);
    expect(summary).toContain('my-lib');
    expect(summary).toContain('3 releases');
  });

  it('warns about breaking changes', () => {
    const info = makePackageInfo();
    const result = extractReleaseNotes(info);
    const summary = formatReleaseNotesSummary(result);
    expect(summary).toContain('breaking changes');
  });

  it('shows at most 5 notes', () => {
    const versions: Record<string, unknown> = {};
    for (let i = 1; i <= 10; i++) versions[`1.${i}.0`] = { description: `Release ${i}` };
    const info = makePackageInfo({ versions } as never);
    const result = extractReleaseNotes(info);
    const summary = formatReleaseNotesSummary(result);
    const lines = summary.split('\n').filter((l) => l.startsWith('  1.'));
    expect(lines.length).toBeLessThanOrEqual(5);
  });
});
