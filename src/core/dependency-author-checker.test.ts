import {
  classifyAuthorRisk,
  buildAuthorFlags,
  isOrgAuthor,
  buildAuthorEntry,
  checkDependencyAuthors,
  summarizeAuthors,
} from './dependency-author-checker';
import { PackageInfo } from '../types';

function makePkg(overrides: Partial<PackageInfo> = {}): PackageInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    latestVersion: '1.0.0',
    description: '',
    author: 'Alice',
    authorEmail: 'alice@example.com',
    maintainers: ['alice'],
    ...overrides,
  } as PackageInfo;
}

describe('classifyAuthorRisk', () => {
  it('returns high when no author', () => {
    expect(classifyAuthorRisk(null, 2)).toBe('high');
  });

  it('returns high when no maintainers', () => {
    expect(classifyAuthorRisk('Alice', 0)).toBe('high');
  });

  it('returns medium for single maintainer', () => {
    expect(classifyAuthorRisk('Alice', 1)).toBe('medium');
  });

  it('returns low for multiple maintainers with author', () => {
    expect(classifyAuthorRisk('Alice', 3)).toBe('low');
  });
});

describe('buildAuthorFlags', () => {
  it('adds no-author flag when author is null', () => {
    expect(buildAuthorFlags(null, 2)).toContain('no-author');
  });

  it('adds no-maintainers flag when count is 0', () => {
    expect(buildAuthorFlags('Alice', 0)).toContain('no-maintainers');
  });

  it('adds single-maintainer flag when count is 1', () => {
    expect(buildAuthorFlags('Alice', 1)).toContain('single-maintainer');
  });

  it('returns empty flags for healthy package', () => {
    expect(buildAuthorFlags('Alice', 3)).toHaveLength(0);
  });
});

describe('isOrgAuthor', () => {
  it('detects inc in author name', () => {
    expect(isOrgAuthor('Acme Inc')).toBe(true);
  });

  it('detects team in author name', () => {
    expect(isOrgAuthor('React Team')).toBe(true);
  });

  it('returns false for individual name', () => {
    expect(isOrgAuthor('John Doe')).toBe(false);
  });
});

describe('buildAuthorEntry', () => {
  it('builds a complete entry', () => {
    const pkg = makePkg({ maintainers: ['alice', 'bob'] });
    const entry = buildAuthorEntry(pkg);
    expect(entry.name).toBe('test-pkg');
    expect(entry.author).toBe('Alice');
    expect(entry.numMaintainers).toBe(2);
    expect(entry.riskLevel).toBe('low');
  });

  it('marks unknown author when missing', () => {
    const pkg = makePkg({ author: undefined, maintainers: [] });
    const entry = buildAuthorEntry(pkg);
    expect(entry.author).toBe('unknown');
    expect(entry.riskLevel).toBe('high');
  });
});

describe('checkDependencyAuthors', () => {
  it('returns an entry per package', () => {
    const pkgs = [makePkg({ name: 'a' }), makePkg({ name: 'b' })];
    expect(checkDependencyAuthors(pkgs)).toHaveLength(2);
  });
});

describe('summarizeAuthors', () => {
  it('counts high risk entries correctly', () => {
    const entries = [
      buildAuthorEntry(makePkg({ author: undefined, maintainers: [] })),
      buildAuthorEntry(makePkg({ maintainers: ['alice', 'bob'] })),
    ];
    const summary = summarizeAuthors(entries);
    expect(summary.total).toBe(2);
    expect(summary.highRisk).toBe(1);
    expect(summary.noAuthor).toBe(1);
  });
});
