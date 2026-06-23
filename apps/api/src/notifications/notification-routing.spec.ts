import { describe, it, expect } from 'vitest';
import { NOTIFICATION_ROUTING, buildCopy, deepLink } from './notification-routing';
import { NOTIFICATION_TYPE_VALUES, NOTIFICATION_CHANNEL_VALUES } from '@perf-tracker/shared';

describe('notification-routing', () => {
  it('has a route for every notification type', () => {
    for (const type of NOTIFICATION_TYPE_VALUES) {
      expect(NOTIFICATION_ROUTING[type]).toBeDefined();
      for (const ch of NOTIFICATION_ROUTING[type].channels) {
        expect(NOTIFICATION_CHANNEL_VALUES).toContain(ch);
      }
    }
  });

  it('matches the plan/05 catalog for the notable cases', () => {
    expect(NOTIFICATION_ROUTING.review_released.priority).toBe('critical');
    expect(NOTIFICATION_ROUTING.feedback_submitted.channels).toEqual(['in_app']);
    expect(NOTIFICATION_ROUTING.appreciation_received.priority).toBe('low');
    expect(NOTIFICATION_ROUTING.appreciation_received.channels).toContain('email'); // via digest only
  });

  it('buildCopy intensifies cycle_ending copy by threshold', () => {
    const copy = buildCopy('cycle_ending', { entity: 'cycle', id: 'c', cycleId: 'c', threshold: 'T-7' });
    expect(copy.body).toContain('7 days remaining');
    expect(copy.title.length).toBeGreaterThan(0);
    expect(copy.emailSubject).toContain('Performance Tracker');
  });

  it('deepLink routes by entity', () => {
    expect(deepLink({ entity: 'cycle', id: 'c1' })).toBe('/reviews/c1');
    expect(deepLink({ entity: 'submission', id: 's', cycleId: 'c2' })).toBe('/reviews/c2');
    expect(deepLink({ entity: 'feedbackRequest', id: 'f' })).toBe('/feedback');
    expect(deepLink({ entity: 'appreciation', id: 'a' })).toBe('/appreciation');
    expect(deepLink(null)).toBe('/notifications');
  });
});
