import { scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
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
  role: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
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
  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = normalizeEmail(input.email);

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, 'Email already registered');
    }

    const userRole = await prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) {
      throw new HttpError(500, 'Role configuration error');
    }

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash: hashPassword(input.password),
        roleId: userRole.id,
      },
      include: {
        role: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = normalizeEmail(input.email);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !passwordsMatch(input.password, user.passwordHash)) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
      token,
    };
  }
}

export const authService = new AuthService();