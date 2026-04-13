import {
  classifyBudgetStatus,
  buildBudgetEntry,
  checkSizeBudgets,
  summarizeBudgets,
  DEFAULT_BUDGET_CONFIG,
} from './dependency-size-budget';
import { Dependency } from '../types';

function makeDep(name: string, currentVersion = '1.0.0'): Dependency {
  return { name, currentVersion, latestVersion: currentVersion, type: 'production' } as Dependency;
}

describe('classifyBudgetStatus', () => {
  const threshold = 0.8;

  it('returns ok when well under budget', () => {
    expect(classifyBudgetStatus(10_000, 50_000, threshold)).toBe('ok');
  });

  it('returns warning when between threshold and budget', () => {
    expect(classifyBudgetStatus(41_000, 50_000, threshold)).toBe('warning');
  });

  it('returns exceeded when over budget', () => {
    expect(classifyBudgetStatus(60_000, 50_000, threshold)).toBe('exceeded');
  });

  it('returns exceeded at exactly budget + 1', () => {
    expect(classifyBudgetStatus(50_001, 50_000, threshold)).toBe('exceeded');
  });
});

describe('buildBudgetEntry', () => {
  const cfg = { ...DEFAULT_BUDGET_CONFIG, defaultBudgetBytes: 50_000 };

  it('builds an ok entry', () => {
    const entry = buildBudgetEntry(makeDep('lodash'), 20_000, cfg);
    expect(entry.name).toBe('lodash');
    expect(entry.status).toBe('ok');
    expect(entry.overageBytes).toBe(0);
    expect(entry.percentUsed).toBe(40);
  });

  it('uses override budget when specified', () => {
    const cfgWithOverride = { ...cfg, overrides: { express: 100_000 } };
    const entry = buildBudgetEntry(makeDep('express'), 90_000, cfgWithOverride);
    expect(entry.budgetBytes).toBe(100_000);
    expect(entry.status).toBe('ok');
  });

  it('calculates overage correctly', () => {
    const entry = buildBudgetEntry(makeDep('react'), 70_000, cfg);
    expect(entry.status).toBe('exceeded');
    expect(entry.overageBytes).toBe(20_000);
  });
});

describe('checkSizeBudgets', () => {
  it('maps each dep to an entry', () => {
    const deps = [makeDep('a'), makeDep('b')];
    const sizeMap = { a: 10_000, b: 60_000 };
    const entries = checkSizeBudgets(deps, sizeMap);
    expect(entries).toHaveLength(2);
    expect(entries[0].status).toBe('ok');
    expect(entries[1].status).toBe('exceeded');
  });

  it('defaults to 0 bytes when dep not in sizeMap', () => {
    const entries = checkSizeBudgets([makeDep('unknown')], {});
    expect(entries[0].sizeBytes).toBe(0);
    expect(entries[0].status).toBe('ok');
  });
});

describe('summarizeBudgets', () => {
  it('aggregates counts and sizes', () => {
    const deps = [makeDep('a'), makeDep('b'), makeDep('c')];
    const sizeMap = { a: 10_000, b: 41_000, c: 60_000 };
    const entries = checkSizeBudgets(deps, sizeMap);
    const summary = summarizeBudgets(entries);
    expect(summary.total).toBe(3);
    expect(summary.ok).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.exceeded).toBe(1);
    expect(summary.totalSizeBytes).toBe(111_000);
  });
});
