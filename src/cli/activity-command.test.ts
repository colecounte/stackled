import { Command } from 'commander';
import { printActivityTable, registerActivityCommand } from './activity-command';
import { ActivityEntry } from '../core/dependency-activity-checker';

function makeEntry(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    name: 'some-lib',
    version: '2.0.0',
    lastCommitDaysAgo: 45,
    openIssues: 12,
    closedIssues: 88,
    issueResolutionRate: 0.88,
    stars: 340,
    activityScore: 82,
    activityGrade: 'A',
    flags: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerActivityCommand(program);
  return program;
}

describe('printActivityTable', () => {
  it('prints header and rows without throwing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printActivityTable([makeEntry()]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('prints message for empty list', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printActivityTable([]);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toMatch(/no packages/i);
    spy.mockRestore();
  });

  it('prints flags when present', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printActivityTable([makeEntry({ flags: ['no-recent-commits', 'low-stars'] })]);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toMatch(/no-recent-commits/);
    spy.mockRestore();
  });

  it('handles null values gracefully', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printActivityTable([
      makeEntry({ lastCommitDaysAgo: null, openIssues: null, issueResolutionRate: null, stars: null }),
    ]);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toMatch(/unknown/);
    spy.mockRestore();
  });

  it('shows grade for each entry', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printActivityTable([makeEntry({ activityGrade: 'F', activityScore: 10 })]);
    const output = spy.mock.calls.flat().join(' ');
    expect(output).toMatch(/F/);
    spy.mockRestore();
  });
});

describe('registerActivityCommand', () => {
  it('registers activity command on program', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'activity');
    expect(cmd).toBeDefined();
  });

  it('activity command has expected options', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'activity')!;
    const optNames = cmd.options.map(o => o.long);
    expect(optNames).toContain('--path');
    expect(optNames).toContain('--min-grade');
    expect(optNames).toContain('--json');
  });
});
