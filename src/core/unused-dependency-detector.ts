import { ParsedDependency } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export interface UnusedDependencyEntry {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface UnusedSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export function scanSourceFiles(projectRoot: string): string {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const ignore = ['node_modules', '.git', 'dist', 'build', 'coverage'];
  let combined = '';

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignore.includes(entry)) continue;
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (extensions.some((e) => entry.endsWith(e))) {
        try {
          combined += fs.readFileSync(full, 'utf8') + '\n';
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(projectRoot);
  return combined;
}

export function classifyConfidence(
  name: string,
  sourceText: string
): { confidence: 'high' | 'medium' | 'low'; reason: string } {
  const importPattern = new RegExp(
    `(require|import)[^'"]*['"](${name}|${name}/)['"]`,
    'g'
  );
  const dynamicPattern = new RegExp(`import\\(['"](${name}|${name}/)['"\\)]`, 'g');

  if (importPattern.test(sourceText) || dynamicPattern.test(sourceText)) {
    return { confidence: 'low', reason: 'Found in import/require statements' };
  }
  if (sourceText.includes(name)) {
    return { confidence: 'medium', reason: 'Name appears in source but not as import' };
  }
  return { confidence: 'high', reason: 'No reference found in source files' };
}

export function buildUnusedEntry(
  dep: ParsedDependency,
  sourceText: string
): UnusedDependencyEntry | null {
  const { confidence, reason } = classifyConfidence(dep.name, sourceText);
  if (confidence === 'low') return null;
  return {
    name: dep.name,
    version: dep.currentVersion,
    type: dep.type === 'devDependency' ? 'devDependency' : 'dependency',
    confidence,
    reason,
  };
}

export function detectUnusedDependencies(
  dependencies: ParsedDependency[],
  projectRoot: string
): { entries: UnusedDependencyEntry[]; summary: UnusedSummary } {
  const sourceText = scanSourceFiles(projectRoot);
  const entries: UnusedDependencyEntry[] = [];

  for (const dep of dependencies) {
    const entry = buildUnusedEntry(dep, sourceText);
    if (entry) entries.push(entry);
  }

  const summary: UnusedSummary = {
    total: entries.length,
    high: entries.filter((e) => e.confidence === 'high').length,
    medium: entries.filter((e) => e.confidence === 'medium').length,
    low: entries.filter((e) => e.confidence === 'low').length,
  };

  return { entries, summary };
}
