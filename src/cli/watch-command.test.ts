import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { printWatchResults, registerWatchCommand } from './watch-command';
import * as watcher from '../core/changelog-watcher';

vi.mock('../core/changelog-watcher', () => ({
  addToWatchList: vi.fn(),
  removeFromWatchList: vi.fn(),
  loadWatchList: vi.fn(),
  checkWatchList: vi.fn(),
}));

vi.mock('../core/changelog-fetcher', () => ({
  changelogFetcher: vi.fn(),
}));

const mockAdd = vi.mocked(watcher.addToWatchList);
const mockRemove = vi.mocked(watcher.removeFromWatchList);
const mockLoad = vi.mocked(watcher.loadWatchList);
const mockCheck = vi.mocked(watcher.checkWatchList);

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerWatchCommand(program);
  return program;
}

beforeEach(() => vi.clearAllMocks());

describe('printWatchResults', () => {
  it('prints message when no results', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printWatchResults([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No packages'));
    spy.mockRestore();
  });

  it('prints results with new release indicator', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printWatchResults([{
      name: 'react',
      currentVersion: '18.0.0',
      latestVersion: '18.2.0',
      hasNewRelease: true,
      summary: 'fix: memory leak',
    }]);
    const calls = spy.mock.calls.map((c) => c.join(' '));
    expect(calls.some((c) => c.includes('react'))).toBe(true);
    spy.mockRestore();
  });
});

describe('registerWatchCommand', () => {
  it('watch add calls addToWatchList', async () => {
    mockAdd.mockReturnValue([{ name: 'lodash', version: '4.0.0', addedAt: '' }]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['watch', 'add', 'lodash', '4.0.0'], { from: 'user' });
    expect(mockAdd).toHaveBeenCalledWith('lodash', '4.0.0');
    spy.mockRestore();
  });

  it('watch remove calls removeFromWatchList', async () => {
    mockRemove.mockReturnValue([]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['watch', 'remove', 'lodash'], { from: 'user' });
    expect(mockRemove).toHaveBeenCalledWith('lodash');
    spy.mockRestore();
  });

  it('watch list prints watched packages', async () => {
    mockLoad.mockReturnValue([{ name: 'axios', version: '1.0.0', addedAt: '2024-01-01' }]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['watch', 'list'], { from: 'user' });
    const output = spy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('axios');
    spy.mockRestore();
  });

  it('watch check calls checkWatchList and prints results', async () => {
    mockCheck.mockResolvedValue([{
      name: 'vue',
      currentVersion: '3.0.0',
      latestVersion: '3.1.0',
      hasNewRelease: true,
    }]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['watch', 'check'], { from: 'user' });
    expect(mockCheck).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
