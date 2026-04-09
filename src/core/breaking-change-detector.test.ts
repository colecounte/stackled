import { describe, it, expect } from 'vitest';
import { BreakingChangeDetector } from './breaking-change-detector.js';
import { DependencyUpdate, ChangelogEntry } from '../types/index.js';

describe('BreakingChangeDetector', () => {
  const detector = new BreakingChangeDetector();

  describe('analyzeUpdate', () => {
    it('should detect major version bump as breaking change', () => {
      const update: DependencyUpdate = {
        packageName: 'react',
        currentVersion: '17.0.2',
        latestVersion: '18.2.0',
        updateType: 'major'
      };

      const result = detector.analyzeUpdate(update);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('major-version');
      expect(result[0].severity).toBe('high');
      expect(result[0].packageName).toBe('react');
    });

    it('should not detect breaking changes for minor version bumps', () => {
      const update: DependencyUpdate = {
        packageName: 'lodash',
        currentVersion: '4.17.20',
        latestVersion: '4.17.21',
        updateType: 'patch'
      };

      const result = detector.analyzeUpdate(update);

      expect(result).toHaveLength(0);
    });

    it('should detect breaking changes from changelog keywords', () => {
      const update: DependencyUpdate = {
        packageName: 'express',
        currentVersion: '4.17.1',
        latestVersion: '4.18.0',
        updateType: 'minor'
      };

      const changelog: ChangelogEntry = {
        version: '4.18.0',
        content: 'BREAKING CHANGE: Removed deprecated `app.del()` method. Use `app.delete()` instead.',
        url: 'https://github.com/expressjs/express/releases/tag/4.18.0'
      };

      const result = detector.analyzeUpdate(update, changelog);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('changelog-indicated');
      expect(result[0].description).toContain('Breaking changes detected');
    });

    it('should extract affected APIs from changelog', () => {
      const update: DependencyUpdate = {
        packageName: 'axios',
        currentVersion: '0.27.0',
        latestVersion: '1.0.0',
        updateType: 'major'
      };

      const changelog: ChangelogEntry = {
        version: '1.0.0',
        content: 'BREAKING: Removed `cancelToken` API. Use `AbortController` instead.',
        url: 'https://github.com/axios/axios/releases/tag/v1.0.0'
      };

      const result = detector.analyzeUpdate(update, changelog);

      expect(result.length).toBeGreaterThan(0);
      const breaking = result.find(b => b.type === 'changelog-indicated');
      expect(breaking?.affectedAPIs).toContain('cancelToken');
      expect(breaking?.affectedAPIs).toContain('AbortController');
    });

    it('should handle multiple breaking change indicators', () => {
      const update: DependencyUpdate = {
        packageName: 'vue',
        currentVersion: '2.7.0',
        latestVersion: '3.0.0',
        updateType: 'major'
      };

      const changelog: ChangelogEntry = {
        version: '3.0.0',
        content: '💥 BREAKING CHANGE: Composition API is now the default',
        url: 'https://github.com/vuejs/vue/releases/tag/v3.0.0'
      };

      const result = detector.analyzeUpdate(update, changelog);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(b => b.type === 'major-version')).toBe(true);
      expect(result.some(b => b.type === 'changelog-indicated')).toBe(true);
    });
  });
});
