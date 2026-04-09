import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface StackledConfig {
  registryUrl: string;
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  notifyOnMajor: boolean;
  notifyOnMinor: boolean;
  notifyOnPatch: boolean;
  ignoredPackages: string[];
  outputFormat: 'text' | 'json' | 'markdown';
}

const DEFAULT_CONFIG: StackledConfig = {
  registryUrl: 'https://registry.npmjs.org',
  cacheEnabled: true,
  cacheTtlMinutes: 60,
  notifyOnMajor: true,
  notifyOnMinor: true,
  notifyOnPatch: false,
  ignoredPackages: [],
  outputFormat: 'text',
};

const CONFIG_FILENAME = '.stackledrc.json';

export function getConfigPath(baseDir: string = process.cwd()): string {
  return path.join(baseDir, CONFIG_FILENAME);
}

export function getGlobalConfigPath(): string {
  return path.join(os.homedir(), CONFIG_FILENAME);
}

export function loadConfig(baseDir: string = process.cwd()): StackledConfig {
  const localPath = getConfigPath(baseDir);
  const globalPath = getGlobalConfigPath();

  let fileConfig: Partial<StackledConfig> = {};

  if (fs.existsSync(localPath)) {
    const raw = fs.readFileSync(localPath, 'utf-8');
    fileConfig = JSON.parse(raw);
  } else if (fs.existsSync(globalPath)) {
    const raw = fs.readFileSync(globalPath, 'utf-8');
    fileConfig = JSON.parse(raw);
  }

  return { ...DEFAULT_CONFIG, ...fileConfig };
}

export function saveConfig(config: Partial<StackledConfig>, baseDir: string = process.cwd()): void {
  const configPath = getConfigPath(baseDir);
  const existing = loadConfig(baseDir);
  const merged = { ...existing, ...config };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
}

export function resetConfig(baseDir: string = process.cwd()): void {
  const configPath = getConfigPath(baseDir);
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}
