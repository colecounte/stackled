import {
  parseFundingSources,
  buildFundingEntry,
  checkFunding,
  summarizeFunding,
} from './funding-checker';
import { Dependency } from '../types';

function makeDep(name: string): Dependency {
  return { name, specifiedVersion: '^1.0.0', installedVersion: '1.0.0', type: 'production' };
}

describe('parseFundingSources', () => {
  it('returns empty array for null/undefined', () => {
    expect(parseFundingSources(null)).toEqual([]);
    expect(parseFundingSources(undefined)).toEqual([]);
  });

  it('wraps a plain string url', () => {
    expect(parseFundingSources('https://opencollective.com/foo')).toEqual([
      { type: 'url', url: 'https://opencollective.com/foo' },
    ]);
  });

  it('parses a single object', () => {
    const result = parseFundingSources({ type: 'opencollective', url: 'https://oc.com/pkg' });
    expect(result).toEqual([{ type: 'opencollective', url: 'https://oc.com/pkg' }]);
  });

  it('parses an array of funding objects', () => {
    const raw = [
      { type: 'github', url: 'https://github.com/sponsors/foo' },
      { type: 'opencollective', url: 'https://opencollective.com/foo' },
    ];
    const result = parseFundingSources(raw);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('github');
  });

  it('filters out invalid entries in array', () => {
    const raw = [{ type: 'github', url: 'https://github.com/sponsors/foo' }, null, {}];
    expect(parseFundingSources(raw)).toHaveLength(1);
  });
});

describe('buildFundingEntry', () => {
  it('marks hasFunding true when funding present', () => {
    const dep = makeDep('express');
    const entry = buildFundingEntry(dep, { funding: { type: 'github', url: 'https://github.com/sponsors/expressjs' } });
    expect(entry.hasFunding).toBe(true);
    expect(entry.funding).toHaveLength(1);
  });

  it('marks hasFunding false when no funding', () => {
    const dep = makeDep('some-pkg');
    const entry = buildFundingEntry(dep, {});
    expect(entry.hasFunding).toBe(false);
    expect(entry.funding).toHaveLength(0);
  });
});

describe('checkFunding', () => {
  it('maps each dependency to a funding entry', () => {
    const deps = [makeDep('react'), makeDep('lodash')];
    const registryMap = {
      react: { funding: { type: 'opencollective', url: 'https://opencollective.com/reactjs' } },
      lodash: {},
    };
    const entries = checkFunding(deps, registryMap);
    expect(entries).toHaveLength(2);
    expect(entries[0].hasFunding).toBe(true);
    expect(entries[1].hasFunding).toBe(false);
  });
});

describe('summarizeFunding', () => {
  it('calculates correct percentages', () => {
    const entries = [
      { name: 'a', version: '1.0.0', funding: [{ type: 'github', url: 'x' }], hasFunding: true },
      { name: 'b', version: '1.0.0', funding: [], hasFunding: false },
      { name: 'c', version: '1.0.0', funding: [], hasFunding: false },
      { name: 'd', version: '1.0.0', funding: [{ type: 'oc', url: 'y' }], hasFunding: true },
    ];
    const summary = summarizeFunding(entries);
    expect(summary.total).toBe(4);
    expect(summary.funded).toBe(2);
    expect(summary.unfunded).toBe(2);
    expect(summary.fundedPercent).toBe(50);
  });

  it('handles empty list', () => {
    const summary = summarizeFunding([]);
    expect(summary.fundedPercent).toBe(0);
  });
});
