import {
  formatNotification,
  determineSeverity,
  formatAsText,
  FormattedNotification,
} from './notification-formatter';
import { DependencyReport, ImpactScore } from '../types';

const mockReport: DependencyReport = {
  packageName: 'react',
  currentVersion: '17.0.2',
  latestVersion: '18.0.0',
  updateType: 'major',
  breakingChanges: [
    { type: 'api', description: 'ReactDOM.render is deprecated', severity: 'high' },
    { type: 'behavior', description: 'Concurrent mode enabled by default', severity: 'medium' },
  ],
  recommendation: 'Review migration guide before upgrading.',
};

const mockImpactScore: ImpactScore = {
  score: 8.5,
  factors: ['major version bump', 'multiple breaking changes'],
};

describe('determineSeverity', () => {
  it('returns critical for score >= 8', () => {
    expect(determineSeverity(8)).toBe('critical');
    expect(determineSeverity(10)).toBe('critical');
  });

  it('returns warning for score >= 5 and < 8', () => {
    expect(determineSeverity(5)).toBe('warning');
    expect(determineSeverity(7.9)).toBe('warning');
  });

  it('returns info for score < 5', () => {
    expect(determineSeverity(4.9)).toBe('info');
    expect(determineSeverity(0)).toBe('info');
  });
});

describe('formatNotification', () => {
  let notification: FormattedNotification;

  beforeEach(() => {
    notification = formatNotification(mockReport, mockImpactScore);
  });

  it('sets severity to critical for high impact score', () => {
    expect(notification.severity).toBe('critical');
  });

  it('includes package name and version in title', () => {
    expect(notification.title).toContain('react');
    expect(notification.title).toContain('18.0.0');
  });

  it('includes breaking change count in summary', () => {
    expect(notification.summary).toContain('2 breaking change(s)');
  });

  it('includes impact score in summary', () => {
    expect(notification.summary).toContain('8.5');
  });

  it('lists each breaking change in details', () => {
    expect(notification.details).toHaveLength(2);
    expect(notification.details[0]).toContain('ReactDOM.render is deprecated');
  });

  it('includes a timestamp', () => {
    expect(notification.timestamp).toBeTruthy();
    expect(new Date(notification.timestamp).toISOString()).toBe(notification.timestamp);
  });

  it('handles empty breaking changes gracefully', () => {
    const emptyReport = { ...mockReport, breakingChanges: [] };
    const result = formatNotification(emptyReport, { score: 2, factors: [] });
    expect(result.details).toContain('No breaking changes detected.');
  });
});

describe('formatAsText', () => {
  it('returns a non-empty string with all sections', () => {
    const notification = formatNotification(mockReport, mockImpactScore);
    const text = formatAsText(notification);
    expect(text).toContain(notification.title);
    expect(text).toContain(notification.summary);
    expect(text).toContain('Details:');
    expect(text).toContain('Reported at:');
  });
});
