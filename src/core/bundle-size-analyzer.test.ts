import {
  formatBytes,
  classifyBundleImpact,
  buildBundleSizeEntry,
  analyzeBundleSizes,
  BundleSizeEntry,
} from './bundle-size-analyzer';

describe('formatBytes', () => {
  it('returns 0 B for zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(10_240)).toBe('10 KB');
    expect(formatBytes(1_048_576)).toBe('1 MB');
  });
});

describe('classifyBundleImpact', () => {
  it('classifies small bundles as low', () => {
    expect(classifyBundleImpact(5_000)).toBe('low');
  });

  it('classifies medium bundles', () => {
    expect(classifyBundleImpact(50_000)).toBe('medium');
  });

  it('classifies large bundles as high', () => {
    expect(classifyBundleImpact(200_000)).toBe('high');
  });
});

describe('buildBundleSizeEntry', () => {
  it('builds entry with treeshakeable flag derived from hasSideEffects', () => {
    const entry = buildBundleSizeEntry('lodash', '4.17.21', {
      gzip: 24_000,
      minified: 72_000,
      hasSideEffects: true,
    });
    expect(entry.name).toBe('lodash');
    expect(entry.treeshakeable).toBe(false);
    expect(entry.gzip).toBe(24_000);
  });

  it('marks treeshakeable when no side effects', () => {
    const entry = buildBundleSizeEntry('date-fns', '3.0.0', {
      gzip: 5_000,
      minified: 15_000,
      hasSideEffects: false,
    });
    expect(entry.treeshakeable).toBe(true);
  });
});

describe('analyzeBundleSizes', () => {
  const entries: BundleSizeEntry[] = [
    { name: 'react', version: '18.0.0', gzip: 11_000, minified: 42_000, hasSideEffects: false, treeshakeable: true },
    { name: 'lodash', version: '4.17.21', gzip: 24_000, minified: 72_000, hasSideEffects: true, treeshakeable: false },
    { name: 'axios', version: '1.6.0', gzip: 13_000, minified: 40_000, hasSideEffects: false, treeshakeable: true },
  ];

  it('computes totals correctly', () => {
    const result = analyzeBundleSizes(entries);
    expect(result.totalGzip).toBe(48_000);
    expect(result.totalMinified).toBe(154_000);
  });

  it('identifies the largest package', () => {
    const result = analyzeBundleSizes(entries);
    expect(result.largestPackage?.name).toBe('lodash');
  });

  it('returns null largestPackage for empty entries', () => {
    const result = analyzeBundleSizes([]);
    expect(result.largestPackage).toBeNull();
  });
});
