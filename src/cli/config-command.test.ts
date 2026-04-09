import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleConfigGet, handleConfigSet, handleConfigList, handleConfigReset } from './config-command';
import { getConfigPath, loadConfig } from '../core/config-manager';

describe('config-command', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackled-cli-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('handleConfigGet', () => {
    it('prints the value of a known config key', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      handleConfigGet('outputFormat');
      expect(spy).toHaveBeenCalledWith('text');
      spy.mockRestore();
    });

    it('exits with error for unknown key', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      expect(() => handleConfigGet('unknownKey' as any)).toThrow('exit');
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('handleConfigSet', () => {
    it('sets a string config value', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      handleConfigSet('registryUrl', 'https://my-registry.example.com');
      const config = loadConfig();
      expect(config.registryUrl).toBe('https://my-registry.example.com');
      spy.mockRestore();
    });

    it('sets a boolean config value', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      handleConfigSet('notifyOnPatch', 'true');
      const config = loadConfig();
      expect(config.notifyOnPatch).toBe(true);
      spy.mockRestore();
    });

    it('sets cacheTtlMinutes as a number', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      handleConfigSet('cacheTtlMinutes', '90');
      const config = loadConfig();
      expect(config.cacheTtlMinutes).toBe(90);
      spy.mockRestore();
    });

    it('exits on invalid outputFormat value', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      expect(() => handleConfigSet('outputFormat', 'xml')).toThrow('exit');
      errSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('exits on unknown key', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
      expect(() => handleConfigSet('badKey', 'value')).toThrow('exit');
      errSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('handleConfigList', () => {
    it('prints all config keys', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      handleConfigList();
      const output = spy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('registryUrl');
      expect(output).toContain('outputFormat');
      spy.mockRestore();
    });
  });

  describe('handleConfigReset', () => {
    it('removes the config file and logs success', () => {
      fs.writeFileSync(getConfigPath(tmpDir), JSON.stringify({ outputFormat: 'json' }));
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      handleConfigReset();
      expect(fs.existsSync(getConfigPath(tmpDir))).toBe(false);
      spy.mockRestore();
    });
  });
});
