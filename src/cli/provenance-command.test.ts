import { printProvenanceTable, printProvenanceSummary } from './provenance-command';
import { ProvenanceEntry } from '../core/provenance-checker';

const mockEntries: ProvenanceEntry[] = [
  {
    name: 'express',
    version: '4.18.0',
    hasProvenance: true,
    attestationType: 'npm-provenance',
    registryUrl: 'https://registry.npmjs.org/-/npm/v1/attestations/express@4.18.0',
    signingAuthority: 'npmjs.com',
    riskLevel: 'low',
  },
  {
    name: 'legacy-lib',
    version: '1.2.3',
    hasProvenance: false,
    attestationType: null,
    registryUrl: null,
    signingAuthority: null,
    riskLevel: 'high',
  },
];

describe('printProvenanceTable', () => {
  it('prints without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => printProvenanceTable(mockEntries)).not.toThrow();
    spy.mockRestore();
  });

  it('outputs a row per entry', () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((msg) => lines.push(msg));
    printProvenanceTable(mockEntries);
    spy.mockRestore();
    // header + separator + 2 entries
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });
});

describe('printProvenanceSummary', () => {
  it('prints without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => printProvenanceSummary(mockEntries)).not.toThrow();
    spy.mockRestore();
  });

  it('shows correct counts in output', () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((msg) => lines.push(String(msg)));
    printProvenanceSummary(mockEntries);
    spy.mockRestore();
    const joined = lines.join('\n');
    expect(joined).toContain('2');
    expect(joined).toContain('1');
  });
});
