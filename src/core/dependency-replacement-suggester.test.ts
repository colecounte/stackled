import { describe, it, expect } from 'vitest';
import {
  findReplacement,
  suggestReplacements,
  ReplacementSuggestion,
} from './dependency-replacement-suggester';
import { ParsedDependency } from '../types';

function makeDep(name: string, version = '1.0.0'): ParsedDependency {
  return { name, version, type: 'dependency' };
}

describe('findReplacement', () => {
  it('returns suggestion for a known deprecated package', () => {
    const result = findReplacement(makeDep('moment'));
    expect(result).not.toBeNull();
    expect(result!.suggestedPackage).toBe('date-fns');
    expect(result!.confidence).toBe('high');
  });

  it('returns null for an unknown package', () => {
    const result = findReplacement(makeDep('some-unknown-lib'));
    expect(result).toBeNull();
  });

  it('returns high confidence for request', () => {
    const result = findReplacement(makeDep('request'));
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe('high');
    expect(result!.suggestedPackage).toBe('axios');
  });

  it('includes reason in suggestion', () => {
    const result = findReplacement(makeDep('rimraf'));
    expect(result!.reason).toContain('native fs');
  });

  it('sets currentPackage and name to dep name', () => {
    const result = findReplacement(makeDep('glob'));
    expect(result!.name).toBe('glob');
    expect(result!.currentPackage).toBe('glob');
  });
});

describe('suggestReplacements', () => {
  it('returns empty suggestions for no known deprecated deps', () => {
    const result = suggestReplacements([makeDep('express'), makeDep('react')]);
    expect(result.total).toBe(0);
    expect(result.suggestions).toHaveLength(0);
  });

  it('detects multiple known deprecated packages', () => {
    const deps = [makeDep('moment'), makeDep('request'), makeDep('express')];
    const result = suggestReplacements(deps);
    expect(result.total).toBe(2);
    expect(result.suggestions.map(s => s.currentPackage)).toContain('moment');
    expect(result.suggestions.map(s => s.currentPackage)).toContain('request');
  });

  it('counts high confidence suggestions correctly', () => {
    const deps = [makeDep('moment'), makeDep('rimraf'), makeDep('chalk')];
    const result = suggestReplacements(deps);
    expect(result.highConfidence).toBe(2);
  });

  it('returns zero highConfidence when none qualify', () => {
    const deps = [makeDep('chalk'), makeDep('uuid')];
    const result = suggestReplacements(deps);
    expect(result.highConfidence).toBe(0);
  });

  it('handles empty dependency list', () => {
    const result = suggestReplacements([]);
    expect(result.total).toBe(0);
    expect(result.highConfidence).toBe(0);
  });
});
