import {
  classifyCitationRisk,
  buildCitationFlags,
  buildCitationEntry,
  checkDependencyCitations,
  summarizeCitations,
} from './dependency-citation-checker';
import { PackageInfo } from '../types';

function makePkg(overrides: Partial<PackageInfo> & Record<string, unknown> = {}): PackageInfo {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    ...overrides,
  } as PackageInfo;
}

describe('classifyCitationRisk', () => {
  it('returns none when citation file present', () => {
    expect(classifyCitationRisk(true, false, false)).toBe('none');
  });

  it('returns none when doi present', () => {
    expect(classifyCitationRisk(false, true, false)).toBe('none');
  });

  it('returns high when academic license and no citation file', () => {
    expect(classifyCitationRisk(false, false, true)).toBe('high');
  });

  it('returns medium when no citation and no doi', () => {
    expect(classifyCitationRisk(false, false, false)).toBe('medium');
  });
});

describe('buildCitationFlags', () => {
  it('includes all flags when nothing is present', () => {
    const flags = buildCitationFlags(false, false, true);
    expect(flags).toContain('no CITATION.cff');
    expect(flags).toContain('no DOI');
    expect(flags).toContain('academic license');
  });

  it('returns empty array when citation and doi present without academic license', () => {
    const flags = buildCitationFlags(true, true, false);
    expect(flags).toHaveLength(0);
  });
});

describe('buildCitationEntry', () => {
  it('detects citation via keywords', () => {
    const pkg = makePkg({ keywords: ['citation', 'science'] });
    const entry = buildCitationEntry(pkg);
    expect(entry.hasCitationFile).toBe(true);
  });

  it('detects doi via repositoryUrl', () => {
    const pkg = makePkg({ repositoryUrl: 'https://doi.org/10.1234/test' });
    const entry = buildCitationEntry(pkg);
    expect(entry.hasDoi).toBe(true);
    expect(entry.citationUrl).toBe('https://doi.org/10.1234/test');
  });

  it('detects academic license', () => {
    const pkg = makePkg({ license: 'Academic Free License' });
    const entry = buildCitationEntry(pkg);
    expect(entry.hasAcademicLicense).toBe(true);
  });

  it('sets citationUrl to null when no doi', () => {
    const pkg = makePkg({});
    const entry = buildCitationEntry(pkg);
    expect(entry.citationUrl).toBeNull();
  });
});

describe('checkDependencyCitations', () => {
  it('returns one entry per package', () => {
    const pkgs = [makePkg({ name: 'a' }), makePkg({ name: 'b' })];
    const entries = checkDependencyCitations(pkgs);
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('a');
  });
});

describe('summarizeCitations', () => {
  it('counts correctly', () => {
    const pkgs = [
      makePkg({ keywords: ['citation'] }),
      makePkg({ repositoryUrl: 'https://doi.org/10.1' }),
      makePkg({}),
    ];
    const entries = checkDependencyCitations(pkgs);
    const summary = summarizeCitations(entries);
    expect(summary.total).toBe(3);
    expect(summary.withCitation).toBe(1);
    expect(summary.withDoi).toBe(1);
    expect(summary.uncited).toBe(1);
  });
});
