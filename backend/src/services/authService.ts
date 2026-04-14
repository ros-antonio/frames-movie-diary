import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../utils/httpError.js';
import { store } from '../repositories/inMemoryStore.js';

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
  register(input: RegisterInput): AuthUser {
    const email = normalizeEmail(input.email);
    const existingUserId = store.userIdByEmail.get(email);

    if (existingUserId) {
      throw new HttpError(409, 'Email already registered');
    }

    const userId = randomUUID();
    const user = {
      id: userId,
      name: input.name.trim(),
      email,
      passwordHash: hashPassword(input.password),
    };

    store.users.set(userId, user);
    store.userIdByEmail.set(email, userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  login(input: LoginInput): AuthUser {
    const email = normalizeEmail(input.email);
    const userId = store.userIdByEmail.get(email);

    if (!userId) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const user = store.users.get(userId);
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

