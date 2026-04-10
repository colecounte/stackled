import { diffChangelogs, classifyDiffSeverity, formatDiffSummary } from './changelog-diff';
import { ChangelogSummary } from '../types';

function makeSummary(overrides: Partial<ChangelogSummary> = {}): ChangelogSummary {
  return {
    highlights: [],
    hasSecurityFixes: false,
    hasDeprecationNotices: false,
    breakingChanges: 0,
    totalChanges: 0,
    ...overrides,
  };
}

describe('diffChangelogs', () => {
  it('returns empty deltas when summaries are identical', () => {
    const s = makeSummary({ highlights: ['feat: something'], totalChanges: 3 });
    const diff = diffChangelogs('lodash', '4.0.0', '4.0.1', s, s);
    expect(diff.addedHighlights).toEqual([]);
    expect(diff.removedHighlights).toEqual([]);
    expect(diff.totalChangeDelta).toBe(0);
  });

  it('detects added highlights', () => {
    const before = makeSummary({ highlights: ['fix: bug'] });
    const after = makeSummary({ highlights: ['fix: bug', 'feat: new thing'] });
    const diff = diffChangelogs('react', '18.0.0', '18.1.0', before, after);
    expect(diff.addedHighlights).toContain('feat: new thing');
    expect(diff.removedHighlights).toEqual([]);
  });

  it('detects removed highlights', () => {
    const before = makeSummary({ highlights: ['fix: old', 'feat: removed'] });
    const after = makeSummary({ highlights: ['fix: old'] });
    const diff = diffChangelogs('react', '18.0.0', '18.1.0', before, after);
    expect(diff.removedHighlights).toContain('feat: removed');
  });

  it('computes security and breaking deltas', () => {
    const before = makeSummary({ hasSecurityFixes: false, breakingChanges: 1 });
    const after = makeSummary({ hasSecurityFixes: true, breakingChanges: 3 });
    const diff = diffChangelogs('axios', '1.0.0', '2.0.0', before, after);
    expect(diff.securityDelta).toBe(1);
    expect(diff.breakingDelta).toBe(2);
  });

  it('computes total change delta', () => {
    const before = makeSummary({ totalChanges: 5 });
    const after = makeSummary({ totalChanges: 18 });
    const diff = diffChangelogs('express', '4.0.0', '5.0.0', before, after);
    expect(diff.totalChangeDelta).toBe(13);
  });
});

describe('classifyDiffSeverity', () => {
  it('returns critical when security delta is positive', () => {
    const diff = diffChangelogs('pkg', '1.0.0', '1.0.1',
      makeSummary({ hasSecurityFixes: false }),
      makeSummary({ hasSecurityFixes: true })
    );
    expect(classifyDiffSeverity(diff)).toBe('critical');
  });

  it('returns high when breaking changes increase', () => {
    const diff = diffChangelogs('pkg', '1.0.0', '2.0.0',
      makeSummary({ breakingChanges: 0 }),
      makeSummary({ breakingChanges: 2 })
    );
    expect(classifyDiffSeverity(diff)).toBe('high');
  });

  it('returns medium for large total change delta', () => {
    const diff = diffChangelogs('pkg', '1.0.0', '1.1.0',
      makeSummary({ totalChanges: 0 }),
      makeSummary({ totalChanges: 15 })
    );
    expect(classifyDiffSeverity(diff)).toBe('medium');
  });

  it('returns low for minor changes', () => {
    const diff = diffChangelogs('pkg', '1.0.0', '1.0.1',
      makeSummary({ totalChanges: 2 }),
      makeSummary({ totalChanges: 4 })
    );
    expect(classifyDiffSeverity(diff)).toBe('low');
  });
});

describe('formatDiffSummary', () => {
  it('returns no significant changes when nothing changed', () => {
    const s = makeSummary();
    const diff = diffChangelogs('pkg', '1.0.0', '1.0.1', s, s);
    expect(formatDiffSummary(diff)).toBe('no significant changes');
  });

  it('includes security fixes in summary', () => {
    const diff = diffChangelogs('pkg', '1.0.0', '1.0.1',
      makeSummary({ hasSecurityFixes: false }),
      makeSummary({ hasSecurityFixes: true })
    );
    expect(formatDiffSummary(diff)).toContain('security fixes added');
  });
});
