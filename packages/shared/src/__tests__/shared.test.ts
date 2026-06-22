import { describe, it, expect } from 'vitest';
import {
  METRICS,
  QUESTIONS,
  RATING_SCALE_V1,
  RoleSchema,
  loginSchema,
} from '../index';

describe('METRICS', () => {
  it('has exactly 5 metrics', () => {
    expect(METRICS.length).toBe(5);
  });

  it('contains all required metric keys', () => {
    const keys = METRICS.map((m) => m.key);
    expect(keys).toContain('customer_satisfaction');
    expect(keys).toContain('public_speaking');
    expect(keys).toContain('deliverables');
    expect(keys).toContain('mentoring_activity');
    expect(keys).toContain('tech_community_events');
  });

  it('each metric has a non-empty label and description', () => {
    for (const m of METRICS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });
});

describe('QUESTIONS', () => {
  it('has exactly 4 questions', () => {
    expect(QUESTIONS.length).toBe(4);
  });

  it('contains all required question keys in order', () => {
    const keys = QUESTIONS.map((q) => q.key);
    expect(keys).toEqual([
      'overall_achievement',
      'what_went_well',
      'areas_to_improve',
      'plan_next_year',
    ]);
  });

  it('has sequential order values starting at 1', () => {
    const orders = QUESTIONS.map((q) => q.order);
    expect(orders).toEqual([1, 2, 3, 4]);
  });
});

describe('RATING_SCALE_V1', () => {
  it('has exactly 5 levels', () => {
    expect(RATING_SCALE_V1.levels.length).toBe(5);
  });

  it('has version "v1"', () => {
    expect(RATING_SCALE_V1.version).toBe('v1');
  });

  it('has scores 1 through 5 in ascending order', () => {
    const scores = RATING_SCALE_V1.levels.map((l) => l.score);
    expect(scores).toEqual([1, 2, 3, 4, 5]);
  });

  it('each level has a non-empty label and anchor', () => {
    for (const level of RATING_SCALE_V1.levels) {
      expect(level.label.length).toBeGreaterThan(0);
      expect(level.anchor.length).toBeGreaterThan(0);
    }
  });

  it('has the correct labels', () => {
    const labels = RATING_SCALE_V1.levels.map((l) => l.label);
    expect(labels).toEqual([
      'Poor',
      'Below average',
      'On track',
      'Moving forward',
      'Exceeded expectations',
    ]);
  });
});

describe('RoleSchema', () => {
  it('parses "admin" successfully', () => {
    expect(RoleSchema.parse('admin')).toBe('admin');
  });

  it('parses "user" successfully', () => {
    expect(RoleSchema.parse('user')).toBe('user');
  });

  it('rejects "root"', () => {
    expect(() => RoleSchema.parse('root')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => RoleSchema.parse('')).toThrow();
  });
});

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'securepassword123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a bad email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securepassword123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing email', () => {
    const result = loginSchema.safeParse({
      password: 'securepassword123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a password of exactly 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'exactly8',
    });
    expect(result.success).toBe(true);
  });
});
