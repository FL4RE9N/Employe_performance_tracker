import { describe, it, expect } from 'vitest';
import { handler } from './reminder-sweep.handler';

describe('reminder-sweep handler (Phase 0 placeholder)', () => {
  it('returns { ok: true } when called with no arguments', async () => {
    const result = await handler();
    expect(result.ok).toBe(true);
  });

  it('returns { ok: true } when called with an EventBridge event payload', async () => {
    const fakeEvent = {
      version: '0',
      id: 'test-event-id',
      source: 'aws.scheduler',
      time: new Date().toISOString(),
    };
    const result = await handler(fakeEvent);
    expect(result.ok).toBe(true);
  });

  it('result shape includes a note field describing Phase 0 status', async () => {
    const result = await handler();
    expect(result).toMatchObject({
      ok: true,
      note: expect.stringContaining('Phase 0 placeholder'),
    });
  });
});
