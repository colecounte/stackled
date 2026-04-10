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
    const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(output).toContain('some-lib');
    expect(output).toContain('other-lib');
    expect(output).toContain('Pin Recommendations');
  });

  it('displays correct recommended version', () => {
    printPinTable([mockRec({ recommended: '~1.2.3', strategy: 'patch' })]);
    const output = consoleSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
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
});
