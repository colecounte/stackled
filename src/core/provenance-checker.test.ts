import {
  classifyProvenanceRisk,
  buildProvenanceEntry,
  checkProvenances,
  summarizeProvenance,
  ProvenanceEntry,
} from './provenance-checker';
import { Dependency } from '../types';

function makeDep(name: string, version = '1.0.0'): Dependency {
  return { name, version, type: 'production' };
}

const withAttestation = {
  dist: {
    attestations: {
      url: 'https://registry.npmjs.org/-/npm/v1/attestations/express@4.18.0',
      type: 'npm-provenance',
    },
  },
};

const withoutAttestation = { dist: {} };

describe('classifyProvenanceRisk', () => {
  it('returns low for npm-provenance attestation', () => {
    expect(classifyProvenanceRisk(true, 'npm-provenance')).toBe('low');
  });

  it('returns medium for other attestation types', () => {
    expect(classifyProvenanceRisk(true, 'sigstore')).toBe('medium');
  });

  it('returns high when no provenance', () => {
    expect(classifyProvenanceRisk(false, null)).toBe('high');
  });
});

describe('buildProvenanceEntry', () => {
  it('builds entry for package with provenance', () => {
    const entry = buildProvenanceEntry(makeDep('express', '4.18.0'), withAttestation);
    expect(entry.hasProvenance).toBe(true);
    expect(entry.attestationType).toBe('npm-provenance');
    expect(entry.riskLevel).toBe('low');
    expect(entry.signingAuthority).toBe('npmjs.com');
  });

  it('builds entry for package without provenance', () => {
    const entry = buildProvenanceEntry(makeDep('legacy-pkg'), withoutAttestation);
    expect(entry.hasProvenance).toBe(false);
    expect(entry.attestationType).toBeNull();
    expect(entry.riskLevel).toBe('high');
    expect(entry.registryUrl).toBeNull();
  });

  it('handles missing dist field gracefully', () => {
    const entry = buildProvenanceEntry(makeDep('bare-pkg'), {});
    expect(entry.hasProvenance).toBe(false);
    expect(entry.riskLevel).toBe('high');
  });
});

describe('checkProvenances', () => {
  it('maps registry data to provenance entries', () => {
    const deps = [makeDep('express', '4.18.0'), makeDep('lodash', '4.17.21')];
    const registryData = { express: withAttestation, lodash: withoutAttestation };
    const entries = checkProvenances(deps, registryData);
    expect(entries).toHaveLength(2);
    expect(entries[0].hasProvenance).toBe(true);
    expect(entries[1].hasProvenance).toBe(false);
  });

  it('handles missing registry data for a dep', () => {
    const deps = [makeDep('unknown-pkg')];
    const entries = checkProvenances(deps, {});
    expect(entries[0].hasProvenance).toBe(false);
  });
});

describe('summarizeProvenance', () => {
  it('returns correct summary counts', () => {
    const entries: ProvenanceEntry[] = [
      { name: 'a', version: '1.0.0', hasProvenance: true, attestationType: 'npm-provenance', registryUrl: 'url', signingAuthority: 'npmjs.com', riskLevel: 'low' },
      { name: 'b', version: '1.0.0', hasProvenance: false, attestationType: null, registryUrl: null, signingAuthority: null, riskLevel: 'high' },
      { name: 'c', version: '1.0.0', hasProvenance: false, attestationType: null, registryUrl: null, signingAuthority: null, riskLevel: 'high' },
    ];
    const summary = summarizeProvenance(entries);
    expect(summary.total).toBe(3);
    expect(summary.verified).toBe(1);
    expect(summary.unverified).toBe(2);
    expect(summary.highRisk).toBe(2);
  });
});
