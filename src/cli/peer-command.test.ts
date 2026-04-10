import { Command } from 'commander';
import { registerPeerCommand } from './peer-command';
import * as peerChecker from '../core/peer-dependency-checker';
import * as packageParser from '../core/package-parser';
import * as configManager from '../core/config-manager';

jest.mock('../core/peer-dependency-checker');
jest.mock('../core/package-parser');
jest.mock('../core/config-manager');

const mockConfig = { output: 'text', cacheEnabled: true };
const mockParsed = {
  name: 'my-app',
  version: '1.0.0',
  dependencies: { react: '^18.0.0' },
  devDependencies: {},
  peerDependencies: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  (configManager.loadConfig as jest.Mock).mockResolvedValue(mockConfig);
  (packageParser.parsePackageJson as jest.Mock).mockResolvedValue(mockParsed);
});

describe('registerPeerCommand', () => {
  it('registers the peer command on the program', () => {
    const program = new Command();
    registerPeerCommand(program);
    const cmd = program.commands.find((c) => c.name() === 'peer');
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toContain('peer dependency');
  });

  it('outputs JSON when config output is json', async () => {
    (configManager.loadConfig as jest.Mock).mockResolvedValue({ output: 'json' });
    (peerChecker.checkPeerDependencies as jest.Mock).mockReturnValue({
      issues: [],
      missingCount: 0,
      incompatibleCount: 0,
      hasIssues: false,
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const program = new Command();
    registerPeerCommand(program);
    await program.parseAsync(['node', 'stackled', 'peer'], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"hasIssues"'));
    consoleSpy.mockRestore();
  });

  it('sets exit code 1 when issues exist', async () => {
    (peerChecker.checkPeerDependencies as jest.Mock).mockReturnValue({
      issues: [{ package: 'lib', peerDep: 'react', required: '>=17', installed: '16.0.0', compatible: false, missing: false }],
      missingCount: 0,
      incompatibleCount: 1,
      hasIssues: true,
    });

    jest.spyOn(console, 'log').mockImplementation();
    const program = new Command();
    registerPeerCommand(program);
    await program.parseAsync(['node', 'stackled', 'peer'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('sets exit code 0 when no issues', async () => {
    (peerChecker.checkPeerDependencies as jest.Mock).mockReturnValue({
      issues: [],
      missingCount: 0,
      incompatibleCount: 0,
      hasIssues: false,
    });

    jest.spyOn(console, 'log').mockImplementation();
    const program = new Command();
    registerPeerCommand(program);
    await program.parseAsync(['node', 'stackled', 'peer'], { from: 'user' });

    expect(process.exitCode).toBe(0);
  });
});
