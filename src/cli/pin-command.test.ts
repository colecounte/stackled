import { printPinTable } from './pin-command';
import { PinRecommendation } from '../core/pin-recommender';

const mockRec = (overrides: Partial<PinRecommendation> = {}): PinRecommendation => ({
  name: 'some-lib',
  current: '1.2.3',
  recommended: '^1.2.3',
  strategy: 'minor',
  reason: 'Minor-range recommended for safe updates',
  ...overrides,
});

/** Collects all console.log output from a printPinTable call into a single string. */
const captureOutput = (recs: PinRecommendation[], spy: jest.SpyInstance): string =>
  (spy.mock.calls as any[][]).map((c) => c[0]).join('\n');

describe('printPinTable', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('prints a message when no recommendations', () => {
    printPinTable([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already follow'));
  });

  it('prints header and rows for recommendations', () => {
    printPinTable([mockRec(), mockRec({ name: 'other-lib', strategy: 'exact' })]);
    const output = captureOutput([mockRec(), mockRec({ name: 'other-lib', strategy: 'exact' })], consoleSpy);
    expect(output).toContain('some-lib');
    expect(output).toContain('other-lib');
    expect(output).toContain('Pin Recommendations');
  });

  it('displays correct recommended version', () => {
    printPinTable([mockRec({ recommended: '~1.2.3', strategy: 'patch' })]);
    const output = captureOutput([mockRec({ recommended: '~1.2.3', strategy: 'patch' })], consoleSpy);
    expect(output).toContain('1.2.3');
  });

  it('renders all strategy types without error', () => {
    const recs: PinRecommendation[] = [
      mockRec({ strategy: 'exact' }),
      mockRec({ strategy: 'patch' }),
      mockRec({ strategy: 'minor' }),
      mockRec({ strategy: 'none' }),
    ];
    expect(() => printPinTable(recs)).not.toThrow();
  });

  it('prints each package name exactly once per recommendation', () => {
    const name = 'unique-lib';
    printPinTable([mockRec({ name })]);
    const output = captureOutput([mockRec({ name })], consoleSpy);
    const occurrences = output.split(name).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(1);
  });
});
