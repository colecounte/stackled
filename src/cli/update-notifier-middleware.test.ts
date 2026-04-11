import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyIfUpdateAvailable, withUpdateNotifier } from './update-notifier-middleware';

vi.mock('../core/update-notifier', () => ({
  checkSelfUpdate: vi.fn(),
  getUpdateCommand: vi.fn(() => 'npm install -g stackled'),
}));

import { checkSelfUpdate } from '../core/update-notifier';
const mockCheck = vi.mocked(checkSelfUpdate);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

describe('notifyIfUpdateAvailable', () => {
  it('prints nothing when up to date', async () => {
    mockCheck.mockResolvedValue({
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      isOutdated: false,
      checkedAt: new Date().toISOString(),
    });
    await notifyIfUpdateAvailable();
    expect(process.stderr.write).not.toHaveBeenCalled();
  });

  it('prints update banner when outdated', async () => {
    mockCheck.mockResolvedValue({
      currentVersion: '1.0.0',
      latestVersion: '2.0.0',
      isOutdated: true,
      checkedAt: new Date().toISOString(),
    });
    await notifyIfUpdateAvailable();
    expect(process.stderr.write).toHaveBeenCalled();
    const output = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(output).toContain('2.0.0');
    expect(output).toContain('npm install -g stackled');
  });

  it('silently ignores errors from update check', async () => {
    mockCheck.mockRejectedValue(new Error('network error'));
    await expect(notifyIfUpdateAvailable()).resolves.not.toThrow();
  });
});

describe('withUpdateNotifier', () => {
  it('calls the wrapped handler', async () => {
    mockCheck.mockResolvedValue({
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      isOutdated: false,
      checkedAt: new Date().toISOString(),
    });
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = withUpdateNotifier(handler);
    await wrapped('arg1', 'arg2');
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('notifies after handler completes', async () => {
    mockCheck.mockResolvedValue({
      currentVersion: '1.0.0',
      latestVersion: '1.5.0',
      isOutdated: true,
      checkedAt: new Date().toISOString(),
    });
    const order: string[] = [];
    const handler = vi.fn().mockImplementation(async () => { order.push('handler'); });
    const wrapped = withUpdateNotifier(handler);
    await wrapped();
    order.push('after');
    expect(order[0]).toBe('handler');
  });
});
