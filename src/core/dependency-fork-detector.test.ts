import { classifyForkRisk, buildForkFlags, buildForkEntry, detectForks, summarizeForks } from './dependency-fork-detector';

function makePkg(overrides: Record<string, unknown> = {}) {
  return {
    name: 'some-pkg',
    version: '1.0.0',
    description: 'A package',
    repository: { type: 'git', url: 'https://github.com/org/some-pkg' },
    forks: 12,
    originalPackage: undefined,
    ...overrides,
  };
}

describe('classifyForkRisk', () => {
  it('returns high when forks exceed threshold and original is unknown', () => {
    expect(classifyForkRisk(undefined, 500)).toBe('high');
  });

  it('returns medium when original is known but forks are high', () => {
    expect(classifyForkRisk('original-pkg', 200)).toBe('medium');
  });

  it('returns low when original is known and forks are low', () => {
    expect(classifyForkRisk('original-pkg', 10)).toBe('low');
  });

  it('returns low when no original and forks are minimal', () => {
    expect(classifyForkRisk(undefined, 3)).toBe('low');
  });
});

describe('buildForkFlags', () => {
  it('flags abandoned original', () => {
    const flags = buildForkFlags('original-pkg', 150, true);
    expect(flags).toContain('original-abandoned');
  });

  it('flags high fork count', () => {
    const flags = buildForkFlags(undefined, 600, false);
    expect(flags).toContain('high-fork-count');
  });

  it('returns empty array for clean package', () => {
    const flags = buildForkFlags('original-pkg', 5, false);
    expect(flags).toHaveLength(0);
  });
});

describe('buildForkEntry', () => {
  it('builds entry with correct risk for known fork', () => {
    const pkg = makePkg({ originalPackage: 'original-pkg', forks: 50 });
    const entry = buildForkEntry(pkg as any);
    expect(entry.name).toBe('some-pkg');
    expect(entry.risk).toBeDefined();
    expect(Array.isArray(entry.flags)).toBe(true);
  });

  it('builds entry for unknown origin', () => {
    const pkg = makePkg({ originalPackage: undefined, forks: 0 });
    const entry = buildForkEntry(pkg as any);
    expect(entry.originalPackage).toBeUndefined();
  });
});

describe('detectForks', () => {
  it('returns entries for all packages', () => {
    const pkgs = [makePkg(), makePkg({ name: 'other-pkg' })];
    const results = detectForks(pkgs as any[]);
    expect(results).toHaveLength(2);
  });

  it('returns empty array for no packages', () => {
    expect(detectForks([])).toEqual([]);
  });
});

describe('summarizeForks', () => {
  it('counts high risk entries', () => {
    const entries = [
      { name: 'a', risk: 'high', forks: 500, flags: [], originalPackage: undefined },
      { name: 'b', risk: 'low', forks: 2, flags: [], originalPackage: 'b-orig' },
    ];
    const summary = summarizeForks(entries as any[]);
    expect(summary.highRisk).toBe(1);
    expect(summary.total).toBe(2);
  });

  it('returns zero counts for empty input', () => {
    const summary = summarizeForks([]);
    expect(summary.total).toBe(0);
    expect(summary.highRisk).toBe(0);
  });
});
