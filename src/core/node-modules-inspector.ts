import * as fs from 'fs';
import * as path from 'path';

export interface NodeModulesEntry {
  name: string;
  installedVersion: string;
  expectedVersion: string;
  isPhantom: boolean;
  isExtraneous: boolean;
}

export interface NodeModulesSummary {
  total: number;
  phantom: number;
  extraneous: number;
  entries: NodeModulesEntry[];
}

export function readInstalledPackages(nodeModulesPath: string): Record<string, string> {
  const installed: Record<string, string> = {};
  if (!fs.existsSync(nodeModulesPath)) return installed;

  const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name.startsWith('@')
      ? readScopedPackages(nodeModulesPath, entry.name, installed) && entry.name
      : entry.name;
    if (entry.name.startsWith('@')) continue;
    const pkgPath = path.join(nodeModulesPath, entry.name, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        installed[entry.name] = pkg.version ?? 'unknown';
      } catch {
        // skip unreadable
      }
    }
  }
  return installed;
}

function readScopedPackages(
  nodeModulesPath: string,
  scope: string,
  installed: Record<string, string>
): void {
  const scopePath = path.join(nodeModulesPath, scope);
  if (!fs.existsSync(scopePath)) return;
  const scopedEntries = fs.readdirSync(scopePath, { withFileTypes: true });
  for (const se of scopedEntries) {
    if (!se.isDirectory()) continue;
    const fullName = `${scope}/${se.name}`;
    const pkgPath = path.join(scopePath, se.name, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        installed[fullName] = pkg.version ?? 'unknown';
      } catch {
        // skip
      }
    }
  }
}

export function buildNodeModulesEntry(
  name: string,
  installedVersion: string,
  declaredDeps: Record<string, string>
): NodeModulesEntry {
  const expectedVersion = declaredDeps[name] ?? '';
  const isPhantom = !expectedVersion;
  const isExtraneous = isPhantom;
  return { name, installedVersion, expectedVersion, isPhantom, isExtraneous };
}

export function inspectNodeModules(
  projectRoot: string,
  declaredDeps: Record<string, string>
): NodeModulesSummary {
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  const installed = readInstalledPackages(nodeModulesPath);

  const entries: NodeModulesEntry[] = Object.entries(installed).map(([name, version]) =>
    buildNodeModulesEntry(name, version, declaredDeps)
  );

  const phantom = entries.filter((e) => e.isPhantom).length;
  const extraneous = entries.filter((e) => e.isExtraneous).length;

  return { total: entries.length, phantom, extraneous, entries };
}
