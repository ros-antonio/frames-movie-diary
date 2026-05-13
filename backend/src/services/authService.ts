import bcrypt from 'bcrypt';
import { HttpError } from '../utils/httpError.js';
import { prisma } from '../repositories/prismaClient.js';
import { signAuthToken } from '../utils/authSession.js';

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

class AuthService {
  private toAuthUser(user: {
    id: string;
    name: string;
    email: string;
    role: {
      name: string;
    };
  }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
    };
  }

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
        passwordHash: await bcrypt.hash(input.password, 12),
        roleId: userRole.id,
      },
      include: {
        role: true,
      },
    });

    const token = signAuthToken({ userId: user.id, role: user.role.name });

    return {
      user: this.toAuthUser(user),
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = normalizeEmail(input.email);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const token = signAuthToken({ userId: user.id, role: user.role.name });

    return {
      user: this.toAuthUser(user),
      token,
    };
  }

  async getSessionUser(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    return this.toAuthUser(user);
  }

  normalizeEmail(email: string): string {
    return normalizeEmail(email);
  }
}

export const authService = new AuthService();
