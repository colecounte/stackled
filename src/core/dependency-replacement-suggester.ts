import { ParsedDependency } from '../types';

export interface ReplacementSuggestion {
  name: string;
  currentPackage: string;
  suggestedPackage: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  weeklyDownloads?: number;
}

export interface ReplacementSummary {
  total: number;
  highConfidence: number;
  suggestions: ReplacementSuggestion[];
}

const KNOWN_REPLACEMENTS: Record<string, { replacement: string; reason: string; confidence: 'high' | 'medium' | 'low' }> = {
  'request': { replacement: 'axios', reason: 'request is deprecated; axios is actively maintained', confidence: 'high' },
  'node-fetch': { replacement: 'undici', reason: 'undici is the recommended fetch for Node.js 18+', confidence: 'medium' },
  'moment': { replacement: 'date-fns', reason: 'moment is in maintenance mode; date-fns is tree-shakeable', confidence: 'high' },
  'lodash': { replacement: 'lodash-es', reason: 'lodash-es supports ESM and tree-shaking', confidence: 'medium' },
  'uuid': { replacement: 'nanoid', reason: 'nanoid is smaller and faster for unique ID generation', confidence: 'low' },
  'mkdirp': { replacement: 'fs.mkdirSync with recursive', reason: 'native fs supports recursive mkdir since Node.js 10', confidence: 'high' },
  'rimraf': { replacement: 'fs.rmSync with recursive', reason: 'native fs supports recursive rm since Node.js 14', confidence: 'high' },
  'chalk': { replacement: 'picocolors', reason: 'picocolors is significantly smaller with no dependencies', confidence: 'low' },
  'glob': { replacement: 'fast-glob', reason: 'fast-glob is faster and actively maintained', confidence: 'medium' },
  'cross-env': { replacement: 'native env syntax', reason: 'modern Node.js and package managers support cross-platform env', confidence: 'low' },
};

export function findReplacement(
  dep: ParsedDependency
): ReplacementSuggestion | null {
  const entry = KNOWN_REPLACEMENTS[dep.name];
  if (!entry) return null;
  return {
    name: dep.name,
    currentPackage: dep.name,
    suggestedPackage: entry.replacement,
    reason: entry.reason,
    confidence: entry.confidence,
  };
}

export function suggestReplacements(
  deps: ParsedDependency[]
): ReplacementSummary {
  const suggestions: ReplacementSuggestion[] = [];

  for (const dep of deps) {
    const suggestion = findReplacement(dep);
    if (suggestion) suggestions.push(suggestion);
  }

  const highConfidence = suggestions.filter(s => s.confidence === 'high').length;

  return {
    total: suggestions.length,
    highConfidence,
    suggestions,
  };
}
