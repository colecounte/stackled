import { Command } from 'commander';
import { registerTimelineCommand } from './timeline-command';
import * as configManager from '../core/config-manager';
import * as registryClient from '../core/registry-client';
import * as packageParser from '../core/package-parser';
import * as changelogTimeline from '../core/changelog-timeline';

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerTimelineCommand(program);
  return program;
}

describe('registerTimelineCommand', () => {
  const mockClient = { getPackageInfo: jest.fn() };

  beforeEach(() => {
    jest.spyOn(configManager, 'loadConfig').mockResolvedValue({} as never);
    jest.spyOn(registryClient, 'createRegistryClient').mockReturnValue(mockClient as never);
    jest.spyOn(packageParser, 'parsePackageJson').mockResolvedValue({
      dependencies: [{ name: 'react', version: '^18.0.0' }],
      devDependencies: [],
    } as never);
    mockClient.getPackageInfo.mockResolvedValue({
      name: 'react',
      version: '18.2.0',
      time: {
        '18.0.0': new Date(Date.now() - 10 * 86400000).toISOString(),
        '18.2.0': new Date(Date.now() - 3 * 86400000).toISOString(),
        created: new Date(Date.now() - 100 * 86400000).toISOString(),
      },
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('registers the timeline command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'timeline');
    expect(cmd).toBeDefined();
  });

  it('runs and prints timeline output', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'timeline', '--limit', '10'], { from: 'user' });
    expect(console.log).toHaveBeenCalled();
  });

  it('filters by type when --type is provided', async () => {
    const spy = jest.spyOn(changelogTimeline, 'buildChangelogTimeline').mockReturnValue({
      entries: [
        { name: 'react', version: '18.0.0', date: '2024-01-01', daysAgo: 30, type: 'major', summary: '' },
        { name: 'react', version: '18.1.0', date: '2024-02-01', daysAgo: 10, type: 'minor', summary: '' },
      ],
      totalReleases: 2,
      spanDays: 30,
      mostActivePackage: 'react',
    });
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'timeline', '--type', 'major'], { from: 'user' });
    expect(spy).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

  it('handles registry errors gracefully', async () => {
    mockClient.getPackageInfo.mockRejectedValue(new Error('network error'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'stackled', 'timeline'], { from: 'user' })
    ).rejects.toThrow();
    exitSpy.mockRestore();
  });
});
