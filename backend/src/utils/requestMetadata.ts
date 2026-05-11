import type { Request } from 'express';

export function getRequestIp(req: Request): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim();
  }

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim();
  }

  return req.socket.remoteAddress;
}
