import {
  classifyForkRisk,
  buildForkFlags,
  buildForkEntry,
  detectForks,
  summarizeForks,
} from './dependency-fork-detector';
import { PackageInfo } from '../types';

function makePkg(overrides: Partial<PackageInfo> = {}): PackageInfo {
  return {
    name: 'some-pkg',
    version: '1.0.0',
    repositoryUrl: 'https://github.com/org/some-pkg',
    repositoryMeta: undefined,
    ...overrides,
  } as PackageInfo;
}

describe('classifyForkRisk', () => {
  it('returns low when not a fork', () => {
    expect(classifyForkRisk(false, 500, 5)).toBe('low');
  });

  it('returns high when fork with very few stars', () => {
    expect(classifyForkRisk(true, 3, 0)).toBe('high');
  });

  it('returns medium when fork with decent stars but many issues', () => {
    expect(classifyForkRisk(true, 100, 60)).toBe('medium');
  });

  it('returns medium when fork with decent stars and low issues', () => {
    expect(classifyForkRisk(true, 50, 10)).toBe('medium');
  });
});

describe('buildForkFlags', () => {
  it('returns empty array for non-fork', () => {
    expect(buildForkFlags(false, 200, 5)).toEqual([]);
  });

  it('includes forked-repo and low-stars for low-star fork', () => {
    const flags = buildForkFlags(true, 2, 0);
    expect(flags).toContain('forked-repo');
    expect(flags).toContain('low-stars');
  });

  it('includes high-open-issues for fork with many issues', () => {
    const flags = buildForkFlags(true, 50, 75);
    expect(flags).toContain('forked-repo');
    expect(flags).toContain('high-open-issues');
  });
});

describe('buildForkEntry', () => {
  it('marks non-fork packages correctly', () => {
    const pkg = makePkg({ repositoryMeta: { isFork: false } });
    const entry = buildForkEntry(pkg);
    expect(entry.isFork).toBe(false);
    expect(entry.forkRisk).toBe('low');
    expect(entry.parentUrl).toBeNull();
  });

  it('marks forked packages with parent url', () => {
    const pkg = makePkg({
      repositoryMeta: {
        isFork: true,
        parentUrl: 'https://github.com/original/some-pkg',
        stars: 5,
        openIssues: 2,
      },
    });
    const entry = buildForkEntry(pkg);
    expect(entry.isFork).toBe(true);
    expect(entry.parentUrl).toBe('https://github.com/original/some-pkg');
    expect(entry.forkRisk).toBe('high');
  });

  it('handles missing repositoryMeta gracefully', () => {
    const pkg = makePkg({ repositoryMeta: undefined });
    const entry = buildForkEntry(pkg);
    expect(entry.isFork).toBe(false);
    expect(entry.flags).toEqual([]);
  });
});

describe('detectForks', () => {
  it('returns an entry per package', () => {
    const pkgs = [makePkg({ name: 'a' }), makePkg({ name: 'b' })];
    expect(detectForks(pkgs)).toHaveLength(2);
  });
});

describe('summarizeForks', () => {
  it('counts forks and high risk entries', () => {
    const pkgs = [
      makePkg({ name: 'a', repositoryMeta: { isFork: false } }),
      makePkg({ name: 'b', repositoryMeta: { isFork: true, stars: 3, openIssues: 0 } }),
      makePkg({ name: 'c', repositoryMeta: { isFork: true, stars: 50, openIssues: 10 } }),
    ];
    const entries = detectForks(pkgs);
    const summary = summarizeForks(entries);
    expect(summary.total).toBe(3);
    expect(summary.forks).toBe(2);
    expect(summary.highRisk).toBe(1);
  });
});
