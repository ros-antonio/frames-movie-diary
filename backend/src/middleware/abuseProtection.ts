import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type RateLimitExceededEventHandler } from 'express-rate-limit';
import { slowDown } from 'express-slow-down';
import { prisma } from '../repositories/prismaClient.js';
import { config } from '../config.js';
import { hashSensitiveToken } from '../utils/mfa.js';
import { verifyToken, type MfaChallengeTokenPayload } from '../utils/authSession.js';

function isDisabled() {
  return config.nodeEnv === 'test';
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase()
    : null;
}

function ipKey(req: Request) {
  return ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown');
}

function jsonLimitHandler(message: string): RateLimitExceededEventHandler {
  return (_req, res, _next, options) => {
    res.status(options.statusCode).json({ message });
  };
}

function createIpLimiter(options: {
  windowMs: number;
  limit: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skip?: (req: Request) => boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    skip: (req) => isDisabled() || options.skip?.(req) === true,
    keyGenerator: (req) => ipKey(req),
    handler: jsonLimitHandler(options.message),
  });
}

function createAccountLimiter(options: {
  windowMs: number;
  limit: number;
  message: string;
  keyGenerator: (req: Request) => Promise<string | null> | string | null;
  skipSuccessfulRequests?: boolean;
  skip?: (req: Request) => boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests,
    skip: (req) => isDisabled() || options.skip?.(req) === true,
    keyGenerator: async (req) => {
      const accountKey = await options.keyGenerator(req);
      return accountKey ?? ipKey(req);
    },
    handler: jsonLimitHandler(options.message),
  });
}

async function passwordResetAccountKey(req: Request) {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token) {
    return null;
  }

  const tokenHash = hashSensitiveToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });

  return resetToken
    ? `password-reset-account:${resetToken.userId}`
    : `password-reset-token:${tokenHash}`;
}

function challengeAccountKey(req: Request) {
  const challengeToken = typeof req.body?.challengeToken === 'string'
    ? req.body.challengeToken.trim()
    : '';

  if (!challengeToken) {
    return null;
  }

  try {
    const payload = verifyToken<MfaChallengeTokenPayload>(challengeToken);
    if (payload.type === 'mfa_challenge') {
      return `mfa-challenge:${payload.userId}`;
    }
  } catch {
    return `mfa-challenge-token:${hashSensitiveToken(challengeToken)}`;
  }

  return null;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const globalApiSlowdown = slowDown({
  windowMs: FIFTEEN_MINUTES,
  delayAfter: 75,
  delayMs: () => 250,
  maxDelayMs: 2_000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => isDisabled() || req.path === '/health',
});

export const globalApiLimiter = createIpLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  message: 'Too many API requests from this IP. Please try again shortly.',
  skip: (req) => req.path === '/health',
});

export const loginIpLimiter = createIpLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: 'Too many login attempts from this IP. Please try again in a few minutes.',
  skipSuccessfulRequests: true,
});

export const loginAccountLimiter = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 8,
  message: 'Too many login attempts for this account. Please try again in a few minutes.',
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = normalizeEmail(req.body?.email);
    return email ? `login-account:${email}` : null;
  },
});

export const passwordForgotIpLimiter = createIpLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: 'Too many password reset requests from this IP. Please try again later.',
});

export const passwordForgotAccountLimiter = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  message: 'Too many password reset requests for this account. Please try again later.',
  keyGenerator: (req) => {
    const email = normalizeEmail(req.body?.email);
    return email ? `password-forgot-account:${email}` : null;
  },
});

export const passwordResetIpLimiter = createIpLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: 'Too many password reset submissions from this IP. Please try again later.',
});

export const passwordResetAccountLimiter = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 6,
  message: 'Too many password reset submissions for this account. Please try again later.',
  keyGenerator: passwordResetAccountKey,
});

export const mfaVerifyIpLimiter = createIpLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: 'Too many MFA verification attempts from this IP. Please try again later.',
  skipSuccessfulRequests: true,
});

export const mfaVerifyAccountLimiter = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 8,
  message: 'Too many MFA verification attempts for this account. Please try again later.',
  skipSuccessfulRequests: true,
  keyGenerator: challengeAccountKey,
});

const authenticatedMfaIpMessage = 'Too many MFA security actions from this IP. Please try again later.';
const authenticatedMfaAccountMessage = 'Too many MFA security actions for this account. Please try again later.';

export const mfaActionIpLimiter = createIpLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  message: authenticatedMfaIpMessage,
});

export const mfaActionAccountLimiter = createAccountLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: authenticatedMfaAccountMessage,
  keyGenerator: (req) => req.user?.userId ? `mfa-account:${req.user.userId}` : null,
});
