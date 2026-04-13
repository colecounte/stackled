import { classifyChange, diffDependencies, summarizeDiff } from './dependency-diff';
import { ParsedDependency } from '../types';

const makeDep = (name: string, version: string): ParsedDependency => ({
  name,
  version,
  type: 'dependency',
  raw: `${name}@${version}`,
});

describe('classifyChange', () => {
  it('returns added when fromVersion is null', () => {
    expect(classifyChange(null, '1.0.0')).toBe('added');
  });

  it('returns removed when toVersion is null', () => {
    expect(classifyChange('1.0.0', null)).toBe('removed');
  });

  it('returns unchanged when versions are equal', () => {
    expect(classifyChange('2.3.1', '2.3.1')).toBe('unchanged');
  });

  it('returns upgraded when new version is higher', () => {
    expect(classifyChange('1.0.0', '2.0.0')).toBe('upgraded');
    expect(classifyChange('1.0.0', '1.1.0')).toBe('upgraded');
    expect(classifyChange('1.0.0', '1.0.1')).toBe('upgraded');
  });

  it('returns downgraded when new version is lower', () => {
    expect(classifyChange('2.0.0', '1.0.0')).toBe('downgraded');
  });
});

describe('diffDependencies', () => {
  it('detects added dependencies', () => {
    const result = diffDependencies([], [makeDep('lodash', '4.17.21')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'lodash', changeType: 'added', fromVersion: null, toVersion: '4.17.21' });
  });

  it('detects removed dependencies', () => {
    const result = diffDependencies([makeDep('lodash', '4.17.21')], []);
    expect(result[0]).toMatchObject({ name: 'lodash', changeType: 'removed', fromVersion: '4.17.21', toVersion: null });
  });

  it('detects upgraded dependencies', () => {
    const result = diffDependencies([makeDep('react', '17.0.0')], [makeDep('react', '18.0.0')]);
    expect(result[0]).toMatchObject({ changeType: 'upgraded', fromVersion: '17.0.0', toVersion: '18.0.0' });
  });

  it('detects unchanged dependencies', () => {
    const result = diffDependencies([makeDep('chalk', '5.0.0')], [makeDep('chalk', '5.0.0')]);
    expect(result[0].changeType).toBe('unchanged');
  });

  it('returns entries sorted by name', () => {
    const result = diffDependencies(
      [makeDep('zod', '3.0.0'), makeDep('axios', '1.0.0')],
      [makeDep('zod', '3.1.0'), makeDep('axios', '1.0.0')]
    );
    expect(result.map(r => r.name)).toEqual(['axios', 'zod']);
  });
});

describe('summarizeDiff', () => {
  it('counts each change type correctly', () => {
    const entries = diffDependencies(
      [makeDep('a', '1.0.0'), makeDep('b', '2.0.0')],
      [makeDep('a', '1.1.0'), makeDep('c', '1.0.0')]
    );
    const summary = summarizeDiff(entries);
    expect(summary.upgraded).toBe(1);
    expect(summary.removed).toBe(1);
    expect(summary.added).toBe(1);
    expect(summary.total).toBe(3);
  });
});
