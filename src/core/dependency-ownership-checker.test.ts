import {
  classifyOwnershipRisk,
  hasOrgOwner,
  buildOwnerEntry,
  summarizeOwnership,
  checkOwnership,
} from './dependency-ownership-checker';
import { Dependency } from '../types';

function makeDep(name: string): Dependency {
  return { name, currentVersion: '1.0.0', latestVersion: '1.0.0', type: 'production' };
}

describe('classifyOwnershipRisk', () => {
  it('returns high for empty owners', () => {
    expect(classifyOwnershipRisk([])).toBe('high');
  });

  it('returns medium for single owner', () => {
    expect(classifyOwnershipRisk(['alice'])).toBe('medium');
  });

  it('returns low for multiple owners', () => {
    expect(classifyOwnershipRisk(['alice', 'bob'])).toBe('low');
  });
});

describe('hasOrgOwner', () => {
  it('detects org-prefixed owners', () => {
    expect(hasOrgOwner(['@myorg', 'alice'])).toBe(true);
  });

  it('returns false when no org owner', () => {
    expect(hasOrgOwner(['alice', 'bob'])).toBe(false);
  });
});

describe('buildOwnerEntry', () => {
  it('builds entry for no owners', () => {
    const entry = buildOwnerEntry(makeDep('lodash'), []);
    expect(entry.risk).toBe('high');
    expect(entry.reason).toMatch(/No owners/);
    expect(entry.hasOrgOwner).toBe(false);
  });

  it('builds entry for single owner', () => {
    const entry = buildOwnerEntry(makeDep('lodash'), ['alice']);
    expect(entry.risk).toBe('medium');
    expect(entry.reason).toMatch(/Single maintainer/);
  });

  it('builds entry for org owner', () => {
    const entry = buildOwnerEntry(makeDep('react'), ['@facebook']);
    expect(entry.hasOrgOwner).toBe(true);
  });
});

describe('summarizeOwnership', () => {
  it('counts categories correctly', () => {
    const entries = [
      buildOwnerEntry(makeDep('a'), []),
      buildOwnerEntry(makeDep('b'), ['alice']),
      buildOwnerEntry(makeDep('c'), ['@org', 'bob']),
    ];
    const summary = summarizeOwnership(entries);
    expect(summary.total).toBe(3);
    expect(summary.noOwner).toBe(1);
    expect(summary.singleOwner).toBe(1);
    expect(summary.orgOwned).toBe(1);
  });
});

describe('checkOwnership', () => {
  it('calls fetchOwners for each dep', async () => {
    const fetch = jest.fn().mockResolvedValue(['alice', 'bob']);
    const deps = [makeDep('express'), makeDep('lodash')];
    const results = await checkOwnership(deps, fetch);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0].risk).toBe('low');
  });

  it('handles fetch errors gracefully', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('network'));
    const results = await checkOwnership([makeDep('broken')], fetch);
    expect(results[0].risk).toBe('high');
    expect(results[0].owners).toEqual([]);
  });
});
