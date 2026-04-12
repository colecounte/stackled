import { Command } from 'commander';
import { registerReleaseNotesCommand } from './release-notes-command';
import * as releaseNotes from '../core/changelog-release-notes';
import * as registryClient from '../core/registry-client';

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerReleaseNotesCommand(program);
  return program;
}

const mockInfo = {
  name: 'chalk',
  version: '5.0.0',
  description: 'Terminal colors',
  versions: {
    '4.0.0': { description: 'Major update' },
    '5.0.0': { description: 'BREAKING CHANGE: ESM only' },
  },
};

const mockClient = {
  getPackageInfo: jest.fn().mockResolvedValue(mockInfo),
};

jest.mock('../core/registry-client', () => ({
  createRegistryClient: jest.fn(() => mockClient),
}));

jest.mock('../core/config-manager', () => ({
  loadConfig: jest.fn(() => ({ registry: 'https://registry.npmjs.org' })),
}));

describe('registerReleaseNotesCommand', () => {
  it('registers the release-notes command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'release-notes');
    expect(cmd).toBeDefined();
  });

  it('command has --from option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'release-notes')!;
    const fromOpt = cmd.options.find((o) => o.long === '--from');
    expect(fromOpt).toBeDefined();
  });

  it('command has --json option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'release-notes')!;
    const jsonOpt = cmd.options.find((o) => o.long === '--json');
    expect(jsonOpt).toBeDefined();
  });
});

describe('printReleaseNotesTable', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(releaseNotes, 'extractReleaseNotes').mockReturnValue({
      packageName: 'chalk',
      notes: [
        { version: '5.0.0', date: '2024-01-01', body: 'BREAKING CHANGE: ESM only', isBreaking: true, hasSecurity: false },
        { version: '4.0.0', date: '2023-06-01', body: 'Major update', isBreaking: false, hasSecurity: false },
      ],
      totalReleases: 2,
      hasBreakingChanges: true,
      hasSecurityFixes: false,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('calls createRegistryClient with registry url', async () => {
    const { printReleaseNotesTable } = await import('./release-notes-command');
    printReleaseNotesTable('chalk', undefined, false);
    await new Promise((r) => setTimeout(r, 10));
    expect(registryClient.createRegistryClient).toHaveBeenCalledWith('https://registry.npmjs.org');
  });

  it('outputs JSON when --json flag is set', async () => {
    const { printReleaseNotesTable } = await import('./release-notes-command');
    printReleaseNotesTable('chalk', undefined, true);
    await new Promise((r) => setTimeout(r, 10));
    const calls = consoleSpy.mock.calls.flat().join('');
    expect(calls).toContain('"packageName"');
  });
});
