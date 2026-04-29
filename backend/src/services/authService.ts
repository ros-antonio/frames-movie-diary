import { scryptSync, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../utils/httpError.js';
import { prisma } from '../repositories/prismaClient.js';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  return scryptSync(password, 'frames-auth-salt', 64).toString('hex');
}

function passwordsMatch(password: string, hash: string): boolean {
  const derived = Buffer.from(hashPassword(password), 'hex');
  const existing = Buffer.from(hash, 'hex');

  if (derived.length !== existing.length) {
    return false;
  }

  return timingSafeEqual(derived, existing);
}

class AuthService {
  async register(input: RegisterInput): Promise<AuthUser> {
    const email = normalizeEmail(input.email);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, 'Email already registered');
    }

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash: hashPassword(input.password),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return user;
  }

  async login(input: LoginInput): Promise<AuthUser> {
    const email = normalizeEmail(input.email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !passwordsMatch(input.password, user.passwordHash)) {
      throw new HttpError(401, 'Invalid email or password');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}

export const authService = new AuthService();
