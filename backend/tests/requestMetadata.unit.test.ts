import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { getRequestIp } from '../src/utils/requestMetadata.js';

function createRequest(input: {
  forwardedFor?: string | string[];
  remoteAddress?: string;
}) {
  return {
    headers: {
      'x-forwarded-for': input.forwardedFor,
    },
    socket: {
      remoteAddress: input.remoteAddress,
    },
  } as Request;
}

describe('request metadata', () => {
  it('reads the first forwarded IP from a comma-separated string header', () => {
    const req = createRequest({
      forwardedFor: '203.0.113.10, 70.41.3.18',
      remoteAddress: '127.0.0.1',
    });

    expect(getRequestIp(req)).toBe('203.0.113.10');
  });

  it('reads the first forwarded IP from an array header', () => {
    const req = createRequest({
      forwardedFor: ['198.51.100.12, 198.51.100.99'],
      remoteAddress: '127.0.0.1',
    });

    expect(getRequestIp(req)).toBe('198.51.100.12');
  });

  it('falls back to the socket remote address when no forwarded header exists', () => {
    const req = createRequest({
      remoteAddress: '192.0.2.55',
    });

    expect(getRequestIp(req)).toBe('192.0.2.55');
  });
});
