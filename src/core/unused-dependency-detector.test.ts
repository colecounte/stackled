import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  classifyConfidence,
  buildUnusedEntry,
  detectUnusedDependencies,
  scanSourceFiles,
} from './unused-dependency-detector';
import { ParsedDependency } from '../types';

function makeDep(name: string, type: 'dependency' | 'devDependency' = 'dependency'): ParsedDependency {
  return {
    name,
    currentVersion: '1.0.0',
    requestedRange: '^1.0.0',
    type,
    registry: 'https://registry.npmjs.org',
  };
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stackled-unused-'));
}

describe('classifyConfidence', () => {
  it('returns low when package is imported', () => {
    const src = `import express from 'express';`;
    const result = classifyConfidence('express', src);
    expect(result.confidence).toBe('low');
  });

  it('returns low for require syntax', () => {
    const src = `const lodash = require('lodash');`;
    const result = classifyConfidence('lodash', src);
    expect(result.confidence).toBe('low');
  });

  it('returns medium when name appears but not as import', () => {
    const src = `// we might use chalk later`;
    const result = classifyConfidence('chalk', src);
    expect(result.confidence).toBe('medium');
  });

  it('returns high when no reference found', () => {
    const src = `const x = 1;`;
    const result = classifyConfidence('some-unused-pkg', src);
    expect(result.confidence).toBe('high');
  });
});

describe('buildUnusedEntry', () => {
  it('returns null when package is used', () => {
    const dep = makeDep('react');
    const src = `import React from 'react';`;
    expect(buildUnusedEntry(dep, src)).toBeNull();
  });

  it('returns entry for unused package', () => {
    const dep = makeDep('unused-lib');
    const entry = buildUnusedEntry(dep, 'const x = 1;');
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe('unused-lib');
    expect(entry!.confidence).toBe('high');
  });

  it('preserves devDependency type', () => {
    const dep = makeDep('jest', 'devDependency');
    const entry = buildUnusedEntry(dep, 'const x = 1;');
    expect(entry!.type).toBe('devDependency');
  });
});

describe('scanSourceFiles', () => {
  it('reads ts files from directory', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'index.ts'), `import foo from 'foo';`);
    const result = scanSourceFiles(dir);
    expect(result).toContain("import foo from 'foo'");
    fs.rmSync(dir, { recursive: true });
  });

  it('ignores node_modules', () => {
    const dir = makeTempDir();
    const nm = path.join(dir, 'node_modules', 'pkg');
    fs.mkdirSync(nm, { recursive: true });
    fs.writeFileSync(path.join(nm, 'index.js'), `require('secret')`);
    const result = scanSourceFiles(dir);
    expect(result).not.toContain('secret');
    fs.rmSync(dir, { recursive: true });
  });
});

describe('detectUnusedDependencies', () => {
  it('returns unused entries and summary', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'app.ts'), `import express from 'express';`);
    const deps = [makeDep('express'), makeDep('lodash')];
    const { entries, summary } = detectUnusedDependencies(deps, dir);
    expect(entries.some((e) => e.name === 'lodash')).toBe(true);
    expect(entries.some((e) => e.name === 'express')).toBe(false);
    expect(summary.total).toBeGreaterThan(0);
    fs.rmSync(dir, { recursive: true });
  });
});
