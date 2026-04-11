import { printSupplyChainTable, printSupplyChainSummary } from './supply-chain-command';
import { SupplyChainEntry } from '../core/supply-chain-checker';

const makeEntry = (name: string, risk: SupplyChainEntry['risk'], reasons: string[] = []): SupplyChainEntry => ({
  name,
  version: '1.2.3',
  publishedAt: '2024-01-01',
  hasInstallScript: risk !== 'low',
  scriptTypes: risk !== 'low' ? ['postinstall'] : [],
  downloadsLastWeek: risk === 'high' ? 50 : 10000,
  risk,
  reasons,
});

describe('printSupplyChainTable', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('prints a no-risk message when entries are empty', () => {
    printSupplyChainTable([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No supply chain risks'));
  });

  it('prints a table row for each entry', () => {
    printSupplyChainTable([
      makeEntry('pkg-a', 'high', ['Has install scripts: postinstall']),
      makeEntry('pkg-b', 'low'),
    ]);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('pkg-a');
    expect(output).toContain('pkg-b');
  });

  it('shows reasons in the row', () => {
    printSupplyChainTable([makeEntry('risky', 'high', ['Low weekly downloads: 50'])]);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Low weekly downloads');
  });
});

describe('printSupplyChainSummary', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs correct counts', () => {
    printSupplyChainSummary([
      makeEntry('a', 'high'),
      makeEntry('b', 'high'),
      makeEntry('c', 'medium'),
      makeEntry('d', 'low'),
    ]);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('4');
    expect(output).toContain('2');
  });
});
