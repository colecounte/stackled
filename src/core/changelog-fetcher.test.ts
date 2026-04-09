import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangelogFetcher } from './changelog-fetcher.js';
import { DependencyInfo } from '../types/index.js';
import https from 'https';

vi.mock('https');

describe('ChangelogFetcher', () => {
  let fetcher: ChangelogFetcher;

  beforeEach(() => {
    fetcher = new ChangelogFetcher();
    vi.clearAllMocks();
  });

  describe('fetchChangelog', () => {
    it('should fetch changelog from GitHub when repository is available', async () => {
      const dependency: DependencyInfo = {
        name: 'react',
        version: '18.2.0',
        currentVersion: '18.2.0',
        latestVersion: '18.2.0',
        repository: 'https://github.com/facebook/react'
      };

      const mockResponse = {
        body: '## What\'s Changed\n- Bug fixes\n- Performance improvements'
      };

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        const mockRes: any = {
          on: vi.fn((event, handler) => {
            if (event === 'data') handler(JSON.stringify(mockResponse));
            if (event === 'end') handler();
            return mockRes;
          })
        };
        cb(mockRes);
        return { on: vi.fn() } as any;
      });

      const result = await fetcher.fetchChangelog(dependency);

      expect(result.packageName).toBe('react');
      expect(result.version).toBe('18.2.0');
      expect(result.source).toBe('github');
      expect(result.changelog).toContain('Bug fixes');
    });

    it('should return null changelog when no source is available', async () => {
      const dependency: DependencyInfo = {
        name: 'unknown-package',
        version: '1.0.0',
        currentVersion: '1.0.0',
        latestVersion: '1.0.0'
      };

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        const mockRes: any = {
          on: vi.fn((event, handler) => {
            if (event === 'error') handler(new Error('Not found'));
            return mockRes;
          })
        };
        return { on: vi.fn((event: string, handler: Function) => {
          if (event === 'error') handler(new Error('Not found'));
        }) } as any;
      });

      const result = await fetcher.fetchChangelog(dependency);

      expect(result.packageName).toBe('unknown-package');
      expect(result.changelog).toBeNull();
      expect(result.source).toBe('none');
    });

    it('should handle GitHub repository URL variations', async () => {
      const dependency: DependencyInfo = {
        name: 'express',
        version: '4.18.0',
        currentVersion: '4.18.0',
        latestVersion: '4.18.0',
        repository: 'https://github.com/expressjs/express.git'
      };

      vi.mocked(https.get).mockImplementation((url: any, options: any, callback: any) => {
        expect(url).toContain('expressjs/express');
        expect(url).not.toContain('.git');
        const cb = typeof options === 'function' ? options : callback;
        const mockRes: any = {
          on: vi.fn((event, handler) => {
            if (event === 'data') handler(JSON.stringify({ body: 'Release notes' }));
            if (event === 'end') handler();
            return mockRes;
          })
        };
        cb(mockRes);
        return { on: vi.fn() } as any;
      });

      const result = await fetcher.fetchChangelog(dependency);
      expect(result.source).toBe('github');
    });
  });
});
