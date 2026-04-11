import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadConfig,
  saveConfig,
  resetConfig,
  getConfigPath,
  getGlobalConfigPath,
  StackledConfig,
} from './config-manager';

describe('config-manager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackled-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('getConfigPath', () => {
    it('returns path to .stackledrc.json in given directory', () => {
      const result = getConfigPath('/some/dir');
      expect(result).toBe('/some/dir/.stackledrc.json');
    });
  });

  describe('getGlobalConfigPath', () => {
    it('returns path in home directory', () => {
      const result = getGlobalConfigPath();
      expect(result).toContain('.stackledrc.json');
      expect(result).toContain(os.homedir());
    });
  });

  describe('loadConfig', () => {
    it('returns default config when no file exists', () => {
      const config = loadConfig(tmpDir);
      expect(config.registryUrl).toBe('https://registry.npmjs.org');
      expect(config.cacheEnabled).toBe(true);
      expect(config.cacheTtlMinutes).toBe(60);
      expect(config.notifyOnPatch).toBe(false);
      expect(config.outputFormat).toBe('text');
    });

    it('merges local config over defaults', () => {
      const localConfig = { outputFormat: 'json', cacheTtlMinutes: 30 };
      fs.writeFileSync(getConfigPath(tmpDir), JSON.stringify(localConfig));
      const config = loadConfig(tmpDir);
      expect(config.outputFormat).toBe('json');
      expect(config.cacheTtlMinutes).toBe(30);
      expect(config.registryUrl).toBe('https://registry.npmjs.org');
    });

    it('returns ignoredPackages as empty array by default', () => {
      const config = loadConfig(tmpDir);
      expect(config.ignoredPackages).toEqual([]);
    });

    it('throws or returns defaults when config file contains invalid JSON', () => {
      fs.writeFileSync(getConfigPath(tmpDir), '{ invalid json }');
      // loadConfig should gracefully fall back to defaults on parse error
      expect(() => loadConfig(tmpDir)).not.toThrow();
      const config = loadConfig(tmpDir);
      expect(config.registryUrl).toBe('https://registry.npmjs.org');
    });
  });

  describe('saveConfig', () => {
    it('writes config to local .stackledrc.json', () => {
      saveConfig({ outputFormat: 'markdown', notifyOnPatch: true }, tmpDir);
      const raw = fs.readFileSync(getConfigPath(tmpDir), 'utf-8');
      const saved: StackledConfig = JSON.parse(raw);
      expect(saved.outputFormat).toBe('markdown');
      expect(saved.notifyOnPatch).toBe(true);
    });

    it('merges with existing config on save', () => {
      saveConfig({ cacheTtlMinutes: 120 }, tmpDir);
      saveConfig({ outputFormat: 'json' }, tmpDir);
      const config = loadConfig(tmpDir);
      expect(config.cacheTtlMinutes).toBe(120);
      expect(config.outputFormat).toBe('json');
    });
  });

  describe('resetConfig', () => {
    it('removes the local config file', () => {
      saveConfig({ outputFormat: 'json' }, tmpDir);
      expect(fs.existsSync(getConfigPath(tmpDir))).toBe(true);
      resetConfig(tmpDir);
      expect(fs.existsSync(getConfigPath(tmpDir))).toBe(false);
    });

    it('does not throw if config file does not exist', () => {
      expect(() => resetConfig(tmpDir)).not.toThrow();
    });
  });
});
