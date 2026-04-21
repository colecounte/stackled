import {
  trackBreakingChanges,
  summarizeBreakingChanges,
} from './dependency-breaking-change-tracker';
import type { PackageInfo, BreakingChange } from '../types';

function makePkg(name: string, version: string): PackageInfo {
  return { name, version, description: '', license: 'MIT' } as PackageInfo;
}

function makeChange(severity: BreakingChange['severity']): BreakingChange {
  return {
    description: `Breaking change of severity ${severity}`,
    severity,
    affectedSymbols: [`${severity}Symbol`],
    migrationNote: severity === 'critical' ? 'See migration guide' : null,
  } as unknown as BreakingChange;
}

describe('dependency-breaking-change-tracker integration', () => {
  it('full pipeline: track and summarize across multiple packages', () => {
    const packages = [
      makePkg('react', '18.0.0'),
      makePkg('lodash', '4.18.0'),
      makePkg('axios', '1.0.0'),
      makePkg('express', '5.0.0'),
    ];

    const previousVersions: Record<string, string> = {
      react: '17.0.0',
      lodash: '4.17.0',
      axios: '1.0.0',   // same version — should be excluded
      express: '4.18.0',
    };

    const changeMap: Record<string, BreakingChange[]> = {
      react: [makeChange('critical'), makeChange('high')],
      lodash: [makeChange('low')],
      express: [makeChange('high'), makeChange('medium'), makeChange('low'), makeChange('low')],
    };

    const entries = trackBreakingChanges(packages, previousVersions, changeMap);
    expect(entries).toHaveLength(3); // axios excluded

    const reactEntry = entries.find((e) => e.name === 'react')!;
    expect(reactEntry.riskLevel).toBe('critical');
    expect(reactEntry.migrationNotes).toBe('See migration guide');

    const expressEntry = entries.find((e) => e.name === 'express')!;
    expect(expressEntry.riskLevel).toBe('medium'); // no critical/high but >3 changes

    const summary = summarizeBreakingChanges(entries);
    expect(summary.packagesAffected).toBe(3);
    expect(summary.total).toBe(7);
    expect(summary.critical).toBe(1);
  });
});
