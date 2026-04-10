import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printTransitiveTable } from './transitive-command';
import type { TransitiveRiskEntry } from '../types';

function makeEntry(overrides: Partial<TransitiveRiskEntry> = {}): TransitiveRiskEntry {
  return {
    name:      'some-lib',
    version:   '1.0.0',
    riskLevel: 'low',
    depth:     2,
    reason:    'No issues found',
    via:       ['parent-pkg'],
    ...overrides,
  };
}

describe('printTransitiveTable', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('prints a success message when there are no entries', () => {
    printTransitiveTable([]);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No transitive risks'));
  });

  it('prints header and rows for provided entries', () => {
    const entries: TransitiveRiskEntry[] = [
      makeEntry({ name: 'lodash', riskLevel: 'high', depth: 3, reason: 'Known vuln' }),
      makeEntry({ name: 'express', riskLevel: 'medium', depth: 1, reason: 'Outdated' }),
    ];
    printTransitiveTable(entries);
    const calls = (console.log as any).mock.calls.flat().join(' ');
    expect(calls).toContain('lodash');
    expect(calls).toContain('express');
    expect(calls).toContain('high');
    expect(calls).toContain('medium');
    expect(calls).toContain('Known vuln');
  });

  it('renders critical risk entries', () => {
    const entries = [makeEntry({ name: 'vuln-pkg', riskLevel: 'critical', reason: 'RCE risk' })];
    printTransitiveTable(entries);
    const calls = (console.log as any).mock.calls.flat().join(' ');
    expect(calls).toContain('vuln-pkg');
    expect(calls).toContain('critical');
  });

  it('renders low risk entries without colour escape issues', () => {
    const entries = [makeEntry({ riskLevel: 'low', name: 'safe-dep' })];
    printTransitiveTable(entries);
    const calls = (console.log as any).mock.calls.flat().join(' ');
    expect(calls).toContain('safe-dep');
  });

  it('prints depth value in the row', () => {
    const entries = [makeEntry({ depth: 5, name: 'deep-dep' })];
    printTransitiveTable(entries);
    const calls = (console.log as any).mock.calls.flat().join(' ');
    expect(calls).toContain('5');
  });
});
