import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerWatchCommand } from './watch-command';

vi.mock('../core/changelog-watcher', () => ({
  loadWatchList: vi.fn(() => []),
  addToWatchList: vi.fn(() => []),
  removeFromWatchList: vi.fn(() => []),
  runWatchCheck: vi.fn(async () => []),
}));

vi.mock('../core/registry-client', () => ({
  createRegistryClient: vi.fn(() => ({})),
}));

import { loadWatchList, addToWatchList, removeFromWatchList, runWatchCheck } from '../core/changelog-watcher';

const mockLoadWatchList = vi.mocked(loadWatchList);
const mockAddToWatchList = vi.mocked(addToWatchList);
const mockRemoveFromWatchList = vi.mocked(removeFromWatchList);
const mockRunWatchCheck = vi.mocked(runWatchCheck);

function buildProgram() {
  const program = new Command();
  program.exitOverride();
  registerWatchCommand(program);
  return program;
}

beforeEach(() => vi.clearAllMocks());

describe('watch add', () => {
  it('calls addToWatchList with package and version', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'watch', 'add', 'react', '17.0.0']);
    expect(mockAddToWatchList).toHaveBeenCalledWith('react', '17.0.0');
  });
});

describe('watch remove', () => {
  it('calls removeFromWatchList with package name', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'watch', 'remove', 'react']);
    expect(mockRemoveFromWatchList).toHaveBeenCalledWith('react');
  });
});

describe('watch list', () => {
  it('prints empty message when list is empty', async () => {
    mockLoadWatchList.mockReturnValue([]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'watch', 'list']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('empty'));
    spy.mockRestore();
  });

  it('prints watched packages when list has entries', async () => {
    mockLoadWatchList.mockReturnValue([{ name: 'lodash', currentVersion: '4.0.0', watchedSince: '' }]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'watch', 'list']);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toContain('lodash');
    spy.mockRestore();
  });
});

describe('watch check', () => {
  it('calls runWatchCheck and prints results', async () => {
    mockRunWatchCheck.mockResolvedValue([{
      name: 'react', currentVersion: '17.0.0', latestVersion: '18.0.0',
      hasUpdate: true, summary: null, checkedAt: '',
    }]);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'watch', 'check']);
    expect(mockRunWatchCheck).toHaveBeenCalled();
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toContain('react');
    spy.mockRestore();
  });
});
