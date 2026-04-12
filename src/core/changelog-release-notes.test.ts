import {
  parseReleaseNote,
  extractReleaseNotes,
  formatReleaseNotesSummary,
  ReleaseNote,
} from './changelog-release-notes';
import { PackageInfo } from '../types';

function makePackageInfo(overrides: Partial<PackageInfo> = {}): PackageInfo {
  return {
    name: 'my-lib',
    currentVersion: '1.0.0',
    latestVersion: '2.0.0',
    description: '',
    license: 'MIT',
    repository: '',
    dependencies: {},
    devDependencies: {},
    ...overrides,
  };
}

describe('parseReleaseNote', () => {
  it('parses basic fields', () => {
    const raw = {
      version: '2.0.0',
      tag_name: '2.0.0',
      name: 'Release 2.0.0',
      body: 'Some improvements.',
      published_at: '2024-01-15',
    };
    const note = parseReleaseNote(raw);
    expect(note.version).toBe('2.0.0');
    expect(note.title).toBe('Release 2.0.0');
    expect(note.date).toBe('2024-01-15');
    expect(note.isBreaking).toBe(false);
    expect(note.isSecurityFix).toBe(false);
  });

  it('detects breaking changes in body', () => {
    const raw = { version: '2.0.0', body: 'BREAKING CHANGE: removed old API.' };
    const note = parseReleaseNote(raw);
    expect(note.isBreaking).toBe(true);
  });

  it('detects security fixes', () => {
    const raw = { version: '1.2.1', body: 'Fix security vulnerability CVE-2024-1234.' };
    const note = parseReleaseNote(raw);
    expect(note.isSecurityFix).toBe(true);
  });

  it('handles missing fields gracefully', () => {
    const note = parseReleaseNote({});
    expect(note.version).toBe('');
    expect(note.body).toBe('');
    expect(note.isBreaking).toBe(false);
  });
});

describe('extractReleaseNotes', () => {
  const releases = [
    { version: '2.0.0', body: 'BREAKING CHANGE: new API', published_at: '2024-03-01' },
    { version: '1.5.0', body: 'Feature additions', published_at: '2024-01-10' },
    { version: '1.0.0', body: 'Initial release', published_at: '2023-12-01' },
  ];

  it('excludes the fromVersion', () => {
    const notes = extractReleaseNotes(releases, '1.0.0', '2.0.0');
    expect(notes.find((n) => n.version === '1.0.0')).toBeUndefined();
  });

  it('returns remaining releases', () => {
    const notes = extractReleaseNotes(releases, '1.0.0', '2.0.0');
    expect(notes.length).toBe(2);
  });

  it('limits to 20 results', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      version: `1.${i}.0`,
      body: 'update',
    }));
    const notes = extractReleaseNotes(many, '0.0.0', '1.29.0');
    expect(notes.length).toBeLessThanOrEqual(20);
  });
});

describe('formatReleaseNotesSummary', () => {
  it('builds summary correctly', () => {
    const pkg = makePackageInfo();
    const notes: ReleaseNote[] = [
      { version: '2.0.0', body: 'BREAKING CHANGE: new API', isBreaking: true, isSecurityFix: false },
      { version: '1.5.0', body: 'Fix security issue', isBreaking: false, isSecurityFix: true },
    ];
    const summary = formatReleaseNotesSummary(pkg, notes);
    expect(summary.packageName).toBe('my-lib');
    expect(summary.totalReleases).toBe(2);
    expect(summary.hasBreakingChanges).toBe(true);
    expect(summary.hasSecurityFixes).toBe(true);
  });

  it('reports false flags when no special notes', () => {
    const pkg = makePackageInfo();
    const notes: ReleaseNote[] = [
      { version: '1.1.0', body: 'Minor update', isBreaking: false, isSecurityFix: false },
    ];
    const summary = formatReleaseNotesSummary(pkg, notes);
    expect(summary.hasBreakingChanges).toBe(false);
    expect(summary.hasSecurityFixes).toBe(false);
  });
});
