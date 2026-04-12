import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildNodeModulesEntry,
  inspectNodeModules,
  readInstalledPackages,
} from './node-modules-inspector';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stackled-nm-'));
}

function writePackageJson(dir: string, name: string, version: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version }));
}

describe('readInstalledPackages', () => {
  it('returns empty object when node_modules does not exist', () => {
    const result = readInstalledPackages('/nonexistent/node_modules');
    expect(result).toEqual({});
  });

  it('reads installed packages from node_modules', () => {
    const tmp = makeTempDir();
    const nm = path.join(tmp, 'node_modules');
    writePackageJson(path.join(nm, 'react'), 'react', '18.2.0');
    writePackageJson(path.join(nm, 'lodash'), 'lodash', '4.17.21');

    const result = readInstalledPackages(nm);
    expect(result['react']).toBe('18.2.0');
    expect(result['lodash']).toBe('4.17.21');

    fs.rmSync(tmp, { recursive: true });
  });

  it('reads scoped packages', () => {
    const tmp = makeTempDir();
    const nm = path.join(tmp, 'node_modules');
    writePackageJson(path.join(nm, '@babel', 'core'), '@babel/core', '7.22.0');

    const result = readInstalledPackages(nm);
    expect(result['@babel/core']).toBe('7.22.0');

    fs.rmSync(tmp, { recursive: true });
  });

  it('skips entries without package.json', () => {
    const tmp = makeTempDir();
    const nm = path.join(tmp, 'node_modules');
    fs.mkdirSync(path.join(nm, 'empty-pkg'), { recursive: true });

    const result = readInstalledPackages(nm);
    expect(result['empty-pkg']).toBeUndefined();

    fs.rmSync(tmp, { recursive: true });
  });
});

describe('buildNodeModulesEntry', () => {
  it('marks package as phantom when not in declared deps', () => {
    const entry = buildNodeModulesEntry('phantom-pkg', '1.0.0', { react: '^18.0.0' });
    expect(entry.isPhantom).toBe(true);
    expect(entry.isExtraneous).toBe(true);
    expect(entry.expectedVersion).toBe('');
  });

  it('marks package as non-phantom when declared', () => {
    const entry = buildNodeModulesEntry('react', '18.2.0', { react: '^18.0.0' });
    expect(entry.isPhantom).toBe(false);
    expect(entry.expectedVersion).toBe('^18.0.0');
    expect(entry.installedVersion).toBe('18.2.0');
  });
});

describe('inspectNodeModules', () => {
  it('returns summary with phantom count', () => {
    const tmp = makeTempDir();
    const nm = path.join(tmp, 'node_modules');
    writePackageJson(path.join(nm, 'react'), 'react', '18.2.0');
    writePackageJson(path.join(nm, 'phantom-pkg'), 'phantom-pkg', '0.1.0');

    const declared = { react: '^18.0.0' };
    const summary = inspectNodeModules(tmp, declared);

    expect(summary.total).toBe(2);
    expect(summary.phantom).toBe(1);
    expect(summary.extraneous).toBe(1);
    expect(summary.entries.some((e) => e.name === 'phantom-pkg' && e.isPhantom)).toBe(true);

    fs.rmSync(tmp, { recursive: true });
  });

  it('returns empty summary when node_modules is missing', () => {
    const summary = inspectNodeModules('/nonexistent', {});
    expect(summary.total).toBe(0);
    expect(summary.phantom).toBe(0);
  });
});
