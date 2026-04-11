import {
  extractHighlights,
  hasSecurityFixes,
  hasDeprecationNotices,
  countChanges,
  summarizeChangelog,
} from './changelog-summarizer';

const sampleChangelog = `
## 2.0.0
- feat: add new API endpoint
- fix: resolve memory leak
- security: patch XSS vulnerability
- deprecate: old config format removed
- perf: improve startup time
- chore: update dependencies
- * minor internal refactor
`;

describe('extractHighlights', () => {
  it('returns lines matching feature/fix/security keywords', () => {
    const lines = sampleChangelog.split('\n');
    const highlights = extractHighlights(lines);
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights.some((h) => /feat/i.test(h))).toBe(true);
  });

  it('limits results to 5', () => {
    const many = Array.from({ length: 20 }, (_, i) => `- feat: item ${i}`);
    expect(extractHighlights(many).length).toBeLessThanOrEqual(5);
  });

  it('returns empty array for unrelated lines', () => {
    expect(extractHighlights(['chore: bump version', '## 1.0.0'])).toEqual([]);
  });

  it('includes security lines in highlights', () => {
    const lines = ['- security: patch CVE-2024-9999'];
    const highlights = extractHighlights(lines);
    expect(highlights).toContain('- security: patch CVE-2024-9999');
  });
});

describe('hasSecurityFixes', () => {
  it('detects security keyword', () => {
    expect(hasSecurityFixes(['- security: patch XSS'])).toBe(true);
  });

  it('detects CVE keyword', () => {
    expect(hasSecurityFixes(['- fix CVE-2024-1234'])).toBe(true);
  });

  it('returns false when no security lines', () => {
    expect(hasSecurityFixes(['- feat: new button'])).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(hasSecurityFixes([])).toBe(false);
  });
});

describe('hasDeprecationNotices', () => {
  it('detects deprecation', () => {
    expect(hasDeprecationNotices(['- deprecate: old API'])).toBe(true);
  });

  it('returns false when none', () => {
    expect(hasDeprecationNotices(['- feat: new stuff'])).toBe(false);
  });
});

describe('countChanges', () => {
  it('counts bullet point lines', () => {
    const lines = ['- fix a', '* add b', '  - nested', 'heading'];
    expect(countChanges(lines)).toBe(3);
  });

  it('returns 0 for empty input', () => {
    expect(countChanges([])).toBe(0);
  });
});

describe('summarizeChangelog', () => {
  it('builds a complete summary', () => {
    const breaking = [{ description: 'API removed', package: 'pkg', severity: 'high' as const }];
    const summary = summarizeChangelog('pkg', '1.0.0', '2.0.0', sampleChangelog, breaking);
    expect(summary.packageName).toBe('pkg');
    expect(summary.fromVersion).toBe('1.0.0');
    expect(summary.toVersion).toBe('2.0.0');
    expect(summary.breakingChanges).toHaveLength(1);
    expect(summary.hasSecurity).toBe(true);
    expect(summary.hasDeprecations).toBe(true);
    expect(summary.totalChanges).toBeGreaterThan(0);
  });

  it('builds a summary with no breaking changes', () => {
    const summary = summarizeChangelog('pkg', '1.0.0', '1.1.0', sampleChangelog, []);
    expect(summary.breakingChanges).toHaveLength(0);
  });
});
