import { Command } from 'commander';
import chalk from 'chalk';
import { printLicenseTable, printLicenseSummary, registerLicenseCommand } from './license-command';
import { LicenseInfo } from '../core/license-checker';

const mockResults: LicenseInfo[] = [
  { packageName: 'lodash', version: '4.17.21', license: 'MIT', risk: 'low', isOsiApproved: true, isCopyleft: false },
  { packageName: 'some-gpl-lib', version: '1.0.0', license: 'GPL-3.0', risk: 'high', isOsiApproved: true, isCopyleft: true },
  { packageName: 'mystery', version: '0.1.0', license: null, risk: 'unknown', isOsiApproved: false, isCopyleft: false },
];

describe('printLicenseTable', () => {
  it('prints a row for each result', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printLicenseTable(mockResults);
    // header + divider + 3 rows = 5 calls
    expect(spy).toHaveBeenCalledTimes(5);
    spy.mockRestore();
  });

  it('includes package name in output', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printLicenseTable(mockResults);
    const allOutput = spy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('lodash');
    expect(allOutput).toContain('some-gpl-lib');
    spy.mockRestore();
  });
});

describe('printLicenseSummary', () => {
  it('prints summary counts', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printLicenseSummary(mockResults);
    const allOutput = spy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('1');
    spy.mockRestore();
  });

  it('warns when high-risk licenses exist', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printLicenseSummary(mockResults);
    const allOutput = spy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('High-risk');
    spy.mockRestore();
  });

  it('does not warn when no high-risk licenses', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    printLicenseSummary([mockResults[0]]);
    const allOutput = spy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).not.toContain('High-risk');
    spy.mockRestore();
  });
});

describe('registerLicenseCommand', () => {
  it('registers a license command on the program', () => {
    const program = new Command();
    registerLicenseCommand(program);
    const cmd = program.commands.find(c => c.name() === 'license');
    expect(cmd).toBeDefined();
  });

  it('license command has expected options', () => {
    const program = new Command();
    registerLicenseCommand(program);
    const cmd = program.commands.find(c => c.name() === 'license')!;
    const optionNames = cmd.options.map(o => o.long);
    expect(optionNames).toContain('--path');
    expect(optionNames).toContain('--fail-on-high');
    expect(optionNames).toContain('--only-high');
  });
});
