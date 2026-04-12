import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  formatAsJson,
  formatAsCsv,
  formatAsMarkdown,
  exportReport,
} from './export-reporter';
import { ScorecardEntry } from '../types';

function makeEntry(overrides: Partial<ScorecardEntry> = {}): ScorecardEntry {
  return {
    name: 'lodash',
    version: '4.17.21',
    grade: 'A',
    score: 92,
    flags: [],
    ...overrides,
  };
}

describe('formatAsJson', () => {
  it('returns valid JSON array', () => {
    const result = formatAsJson([makeEntry()]);
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe('lodash');
  });

  it('returns empty array for no entries', () => {
    expect(JSON.parse(formatAsJson([]))).toEqual([]);
  });
});

describe('formatAsCsv', () => {
  it('returns empty string for no entries', () => {
    expect(formatAsCsv([])).toBe('');
  });

  it('includes header row and data rows', () => {
    const csv = formatAsCsv([makeEntry({ flags: ['deprecated'] })]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('name');
    expect(lines[1]).toContain('lodash');
    expect(lines[1]).toContain('deprecated');
  });

  it('separates multiple flags with semicolons', () => {
    const csv = formatAsCsv([makeEntry({ flags: ['deprecated', 'unmaintained'] })]);
    expect(csv).toContain('deprecated;unmaintained');
  });
});

describe('formatAsMarkdown', () => {
  it('includes default title', () => {
    const md = formatAsMarkdown([makeEntry()]);
    expect(md).toContain('# Dependency Scorecard');
  });

  it('uses custom title when provided', () => {
    const md = formatAsMarkdown([makeEntry()], 'My Report');
    expect(md).toContain('# My Report');
  });

  it('renders table rows for each entry', () => {
    const md = formatAsMarkdown([makeEntry(), makeEntry({ name: 'axios', version: '1.6.0' })]);
    expect(md).toContain('lodash');
    expect(md).toContain('axios');
  });

  it('shows dash when no flags', () => {
    const md = formatAsMarkdown([makeEntry({ flags: [] })]);
    expect(md).toContain('—');
  });
});

describe('exportReport', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackled-export-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes json file to disk', () => {
    const outPath = path.join(tmpDir, 'report.json');
    exportReport([makeEntry()], { format: 'json', outputPath: outPath });
    const content = fs.readFileSync(outPath, 'utf-8');
    expect(JSON.parse(content)[0].name).toBe('lodash');
  });

  it('writes csv file to disk', () => {
    const outPath = path.join(tmpDir, 'report.csv');
    exportReport([makeEntry()], { format: 'csv', outputPath: outPath });
    expect(fs.readFileSync(outPath, 'utf-8')).toContain('lodash');
  });

  it('writes markdown file to disk', () => {
    const outPath = path.join(tmpDir, 'report.md');
    exportReport([makeEntry()], { format: 'markdown', outputPath: outPath, title: 'Test' });
    expect(fs.readFileSync(outPath, 'utf-8')).toContain('# Test');
  });

  it('creates nested directories if needed', () => {
    const outPath = path.join(tmpDir, 'nested', 'deep', 'report.json');
    exportReport([], { format: 'json', outputPath: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('throws for unsupported format', () => {
    expect(() =>
      exportReport([], { format: 'xml' as any, outputPath: path.join(tmpDir, 'r.xml') })
    ).toThrow('Unsupported export format');
  });
});
