import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { prisma } from '../repositories/prismaClient.js';
import { HttpError } from '../utils/httpError.js';
import { buildOtpAuthUri, generateRecoveryCodes, generateTotpSecret, hashSensitiveToken, verifyTotpCode } from '../utils/mfa.js';
import { signAuthToken, signMfaChallengeToken, type AuthTokenPayload, type MfaChallengeTokenPayload, verifyToken } from '../utils/authSession.js';
import { config } from '../config.js';
import type { PermissionName } from '../utils/permissions.js';

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

interface PasswordResetRequestInput {
  email: string;
}

interface PasswordResetInput {
  token: string;
  password: string;
  confirmPassword: string;
}

interface VerifyMfaInput {
  challengeToken: string;
  code: string;
  method: 'totp' | 'recovery_code';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: PermissionName[];
  mfaEnabled: boolean;
}

interface AuthSuccessResponse {
  user: AuthUser;
  token: string;
}

interface AuthChallengeResponse {
  challengeRequired: true;
  challengeToken: string;
  availableMethods: Array<'totp' | 'recovery_code'>;
  user: Pick<AuthUser, 'id' | 'email' | 'name' | 'role' | 'permissions' | 'mfaEnabled'>;
}

export type AuthResponse = AuthSuccessResponse | AuthChallengeResponse;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildPermissionList(role: { permissions: Array<{ name: string }> }) {
  return role.permissions.map((permission) => permission.name as PermissionName).sort();
}

class AuthService {
  private toAuthUser(user: {
    id: string;
    name: string;
    email: string;
    mfaEnabled: boolean;
    role: {
      name: string;
      permissions: Array<{ name: string }>;
    };
  }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: buildPermissionList(user.role),
      mfaEnabled: user.mfaEnabled,
    };
  }

  private toAuthTokenPayload(user: AuthUser, sessionVersion: number): AuthTokenPayload {
    return {
      userId: user.id,
      role: user.role,
      permissions: user.permissions,
      sessionVersion,
    };
  }

  private async findUserForLogin(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }

  private async findUserForSecurityState(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        recoveryCodes: true,
      },
    });
  }

  private async findUserForMfaChallenge(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        recoveryCodes: true,
      },
    });
  }

  private async findUserForPasswordReset(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  private async findUserForSession(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }

  private async findUserForEnrollment(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaPendingSecret: true,
      },
    });
  }

  private async findUserForDisableMfa(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });
  }

  private async findUserForRecoveryCodeRegeneration(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecret: true,
      },
    });
  }

  private async issueRecoveryCodes(userId: string) {
    const codes = generateRecoveryCodes();
    await prisma.$transaction([
      prisma.recoveryCode.deleteMany({ where: { userId } }),
      prisma.recoveryCode.createMany({
        data: codes.map((code) => ({
          userId,
          codeHash: hashSensitiveToken(code),
        })),
      }),
    ]);

    return codes;
  }

  async register(input: RegisterInput): Promise<AuthSuccessResponse> {
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
      include: { permissions: true },
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
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    const authUser = this.toAuthUser(user);
    const token = signAuthToken(this.toAuthTokenPayload(authUser, user.sessionVersion));

    return { user: authUser, token };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = normalizeEmail(input.email);
    const user = await this.findUserForLogin(email);

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const authUser = this.toAuthUser(user);
    const tokenPayload = this.toAuthTokenPayload(authUser, user.sessionVersion);

    if (user.mfaEnabled) {
      return {
        challengeRequired: true,
        challengeToken: signMfaChallengeToken(tokenPayload),
        availableMethods: ['totp', 'recovery_code'],
        user: authUser,
      };
    }

    return {
      user: authUser,
      token: signAuthToken(tokenPayload),
    };
  }

  async verifyMfaChallenge(input: VerifyMfaInput): Promise<AuthSuccessResponse> {
    let challenge: MfaChallengeTokenPayload;

    try {
      challenge = verifyToken<MfaChallengeTokenPayload>(input.challengeToken);
    } catch {
      throw new HttpError(401, 'Invalid or expired MFA challenge');
    }

    if (challenge.type !== 'mfa_challenge') {
      throw new HttpError(401, 'Invalid or expired MFA challenge');
    }

    const user = await this.findUserForMfaChallenge(challenge.userId);
    if (!user || !user.mfaEnabled || user.sessionVersion !== challenge.sessionVersion) {
      throw new HttpError(401, 'Invalid or expired MFA challenge');
    }

    if (input.method === 'totp') {
      if (!user.mfaSecret || !verifyTotpCode(user.mfaSecret, input.code)) {
        throw new HttpError(401, 'Invalid authenticator code');
      }
    } else {
      const recoveryCode = user.recoveryCodes.find((code) => !code.usedAt && code.codeHash === hashSensitiveToken(input.code.trim().toUpperCase()));
      if (!recoveryCode) {
        throw new HttpError(401, 'Invalid recovery code');
      }

      await prisma.recoveryCode.update({
        where: { id: recoveryCode.id },
        data: { usedAt: new Date() },
      });
    }

    const authUser = this.toAuthUser(user);
    return {
      user: authUser,
      token: signAuthToken(this.toAuthTokenPayload(authUser, user.sessionVersion)),
    };
  }

  async getSessionUser(userId: string): Promise<AuthUser> {
    const user = await this.findUserForSession(userId);
    if (!user) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    return this.toAuthUser(user);
  }

  async beginMfaEnrollment(userId: string) {
    const user = await this.findUserForEnrollment(userId);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: userId },
      data: { mfaPendingSecret: secret },
    });

    return {
      secret,
      otpAuthUri: buildOtpAuthUri(secret, user.email, config.authIssuer),
    };
  }

  async completeMfaEnrollment(userId: string, code: string) {
    const user = await this.findUserForEnrollment(userId);
    if (!user?.mfaPendingSecret) {
      throw new HttpError(400, 'No MFA enrollment is pending');
    }

    if (!verifyTotpCode(user.mfaPendingSecret, code)) {
      throw new HttpError(401, 'Invalid authenticator code');
    }

    const recoveryCodes = generateRecoveryCodes();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaSecret: user.mfaPendingSecret,
          mfaPendingSecret: null,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.recoveryCode.deleteMany({ where: { userId } }),
      prisma.recoveryCode.createMany({
        data: recoveryCodes.map((recoveryCode) => ({
          userId,
          codeHash: hashSensitiveToken(recoveryCode),
        })),
      }),
    ]);

    return { recoveryCodes };
  }

  async disableMfa(userId: string, password: string) {
    const user = await this.findUserForDisableMfa(userId);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid password');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaPendingSecret: null,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.recoveryCode.deleteMany({ where: { userId } }),
    ]);
  }

  async regenerateRecoveryCodes(userId: string, code: string) {
    const user = await this.findUserForRecoveryCodeRegeneration(userId);
    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new HttpError(400, 'MFA is not enabled');
    }

    if (!verifyTotpCode(user.mfaSecret, code)) {
      throw new HttpError(401, 'Invalid authenticator code');
    }

    const recoveryCodes = await this.issueRecoveryCodes(userId);
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });

    return { recoveryCodes };
  }

  async requestPasswordReset(input: PasswordResetRequestInput) {
    const email = normalizeEmail(input.email);
    const user = await this.findUserForPasswordReset(email);

    if (!user) {
      return {
        message: 'If an account exists for that email, recovery instructions were generated.',
      };
    }

    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = hashSensitiveToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    return {
      message: 'If an account exists for that email, recovery instructions were generated.',
      ...(config.exposeRecoveryTokens ? {
        resetToken: rawToken,
        expiresAt: expiresAt.toISOString(),
      } : {}),
    };
  }

  async resetPassword(input: PasswordResetInput) {
    const tokenHash = hashSensitiveToken(input.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      throw new HttpError(400, 'Reset token is invalid or expired');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: await bcrypt.hash(input.password, 12),
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: { not: resetToken.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async getSecurityState(userId: string) {
    const user = await this.findUserForSecurityState(userId);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return {
      mfaEnabled: user.mfaEnabled,
      recoveryCodesRemaining: user.recoveryCodes.filter((code) => !code.usedAt).length,
      role: user.role.name,
      permissions: buildPermissionList(user.role),
    };
  }

  normalizeEmail(email: string) {
    return normalizeEmail(email);
  }
}

export const authService = new AuthService();
