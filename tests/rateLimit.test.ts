import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first attempt for a fresh key', () => {
    expect(checkRateLimit('key-a', 3, 1000)).toBe(true);
  });

  it('allows attempts up to the configured maximum', () => {
    expect(checkRateLimit('key-b', 3, 1000)).toBe(true);
    expect(checkRateLimit('key-b', 3, 1000)).toBe(true);
    expect(checkRateLimit('key-b', 3, 1000)).toBe(true);
  });

  it('blocks the attempt once the maximum is exceeded', () => {
    checkRateLimit('key-c', 2, 1000);
    checkRateLimit('key-c', 2, 1000);
    expect(checkRateLimit('key-c', 2, 1000)).toBe(false);
  });

  it('resets the counter once the time window elapses', () => {
    checkRateLimit('key-d', 1, 1000);
    expect(checkRateLimit('key-d', 1, 1000)).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(checkRateLimit('key-d', 1, 1000)).toBe(true);
  });

  it('tracks independent keys independently', () => {
    checkRateLimit('key-e1', 1, 1000);
    expect(checkRateLimit('key-e1', 1, 1000)).toBe(false);
    expect(checkRateLimit('key-e2', 1, 1000)).toBe(true);
  });
});

describe('clientIp', () => {
  it('returns the first address from x-forwarded-for', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    });
    expect(clientIp(req)).toBe('203.0.113.5');
  });

  it('trims whitespace around the forwarded address', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '  203.0.113.9  ,10.0.0.1' },
    });
    expect(clientIp(req)).toBe('203.0.113.9');
  });

  it('falls back to "unknown" when the header is missing', () => {
    const req = new Request('https://example.com');
    expect(clientIp(req)).toBe('unknown');
  });
});
