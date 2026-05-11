import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/utils/httpError.js';

describe('auth service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('normalizes emails through the public helper', async () => {
    const { authService } = await import('../src/services/authService.js');

    expect(authService.normalizeEmail('  TONY@Example.COM ')).toBe('tony@example.com');
  });

  it('throws a role configuration error when the USER role is missing', async () => {
    vi.doMock('../src/repositories/prismaClient.js', () => ({
      prisma: {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
        },
        role: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      },
    }));

    const { authService } = await import('../src/services/authService.js');

    await expect(authService.register({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })).rejects.toThrowError(new HttpError(500, 'Role configuration error'));
  });
});
