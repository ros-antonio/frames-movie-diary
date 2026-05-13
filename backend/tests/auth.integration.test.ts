import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, resetStore } from './testUtils.js';
import { prisma } from '../src/repositories/prismaClient.js';
import { generateTotpCode } from '../src/utils/mfa.js';
import { signMfaChallengeToken } from '../src/utils/authSession.js';
import { USER_PERMISSIONS } from '../src/utils/permissions.js';

describe('auth API', () => {
  beforeEach(async () => {
    await resetStore();
  });

  it('registers and logs in a user', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user).toMatchObject({
      name: 'Tony Stark',
      email: 'tony@example.com',
      role: 'USER',
    });
    expect(registerResponse.body.user.id).toBeTypeOf('string');
    expect(registerResponse.body.token).toBeTypeOf('string');
    expect(registerResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('frames_auth=')]),
    );

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'TONY@EXAMPLE.COM',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user).toMatchObject({
      id: registerResponse.body.user.id,
      name: 'Tony Stark',
      email: 'tony@example.com',
      role: 'USER',
    });
    expect(loginResponse.body.token).toBeTypeOf('string');
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('frames_auth=')]),
    );
  });

  it('rejects duplicate registration by email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Tony',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const duplicate = await request(app).post('/api/auth/register').send({
      name: 'Anthony',
      email: 'TONY@EXAMPLE.COM',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe('Email already registered');
  });

  it('rejects invalid login credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Tony',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'wrong123',
    });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Invalid email or password');

    const unknownUser = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'password123',
    });

    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body.message).toBe('Invalid email or password');
  });

  it('rejects login when stored hash is malformed', async () => {
    const register = await request(app).post('/api/auth/register').send({
      name: 'Tony',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const userId = register.body.user.id as string;
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: 'abcd' },
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
  });

  it('rejects invalid registration payload', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'x',
      email: 'invalid-email',
      password: '123',
      confirmPassword: '456',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  it('clears the auth cookie on logout', async () => {
    const response = await request(app).post('/api/auth/logout').send();

    expect(response.status).toBe(204);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('frames_auth=;')]),
    );
  });

  it('returns the authenticated session user from the auth cookie', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const sessionResponse = await request(app)
      .get('/api/auth/session')
      .set('Cookie', registerResponse.headers['set-cookie']);

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body).toEqual({
      user: expect.objectContaining({
        id: registerResponse.body.user.id,
        name: 'Tony Stark',
        email: 'tony@example.com',
        role: 'USER',
      }),
    });
  });

  it('rejects unauthenticated session lookup', async () => {
    const response = await request(app).get('/api/auth/session');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication required: Missing or invalid token');
  });

  it('supports MFA enrollment and step-up login with an authenticator code', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const authCookie = registerResponse.headers['set-cookie'];
    const setupResponse = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', authCookie);

    expect(setupResponse.status).toBe(200);
    expect(setupResponse.body.secret).toBeTypeOf('string');

    const enableResponse = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Cookie', authCookie)
      .send({
        code: generateTotpCode(setupResponse.body.secret),
      });

    expect(enableResponse.status).toBe(200);
    expect(enableResponse.body.recoveryCodes).toHaveLength(8);

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.challengeRequired).toBe(true);
    expect(loginResponse.body.challengeToken).toBeTypeOf('string');

    const verifyResponse = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: loginResponse.body.challengeToken,
        code: generateTotpCode(setupResponse.body.secret),
        method: 'totp',
      });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.user.mfaEnabled).toBe(true);
    expect(verifyResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('frames_auth=')]),
    );
  });

  it('supports backup recovery codes as a third authentication path', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const authCookie = registerResponse.headers['set-cookie'];
    const setupResponse = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', authCookie);

    const enableResponse = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Cookie', authCookie)
      .send({
        code: generateTotpCode(setupResponse.body.secret),
      });

    const recoveryCode = enableResponse.body.recoveryCodes[0] as string;
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });

    const verifyResponse = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: loginResponse.body.challengeToken,
        code: recoveryCode,
        method: 'recovery_code',
      });

    expect(verifyResponse.status).toBe(200);

    const reusedCodeResponse = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: loginResponse.body.challengeToken,
        code: recoveryCode,
        method: 'recovery_code',
      });

    expect(reusedCodeResponse.status).toBe(401);
    expect(reusedCodeResponse.body.message).toBe('Invalid recovery code');
  });

  it('rejects MFA verification with an invalid challenge token', async () => {
    const response = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: 'not-a-real-token',
        code: '123456',
        method: 'totp',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid or expired MFA challenge');
  });

  it('rejects MFA verification when the challenge token has the wrong type', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const response = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: registerResponse.body.token,
        code: '123456',
        method: 'totp',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid or expired MFA challenge');
  });

  it('rejects MFA verification when the challenge session is stale', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const authCookie = registerResponse.headers['set-cookie'];
    const setupResponse = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', authCookie);

    await request(app)
      .post('/api/auth/mfa/enable')
      .set('Cookie', authCookie)
      .send({
        code: generateTotpCode(setupResponse.body.secret),
      });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'tony@example.com' },
      include: { role: { include: { permissions: true } } },
    });

    const staleChallenge = signMfaChallengeToken({
      userId: user.id,
      role: user.role.name,
      permissions: [...USER_PERMISSIONS],
      sessionVersion: user.sessionVersion - 1,
    });

    const response = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: staleChallenge,
        code: generateTotpCode(setupResponse.body.secret),
        method: 'totp',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid or expired MFA challenge');
  });

  it('rejects invalid authenticator codes during MFA verification', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const authCookie = registerResponse.headers['set-cookie'];
    const setupResponse = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', authCookie);

    await request(app)
      .post('/api/auth/mfa/enable')
      .set('Cookie', authCookie)
      .send({
        code: generateTotpCode(setupResponse.body.secret),
      });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });

    const verifyResponse = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: loginResponse.body.challengeToken,
        code: '000000',
        method: 'totp',
      });

    expect(verifyResponse.status).toBe(401);
    expect(verifyResponse.body.message).toBe('Invalid authenticator code');
  });

  it('rejects enabling MFA when no enrollment is pending', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const response = await request(app)
      .post('/api/auth/mfa/enable')
      .set('Cookie', registerResponse.headers['set-cookie'])
      .send({ code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('No MFA enrollment is pending');
  });

  it('rejects regenerating recovery codes when MFA is not enabled', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const response = await request(app)
      .post('/api/auth/mfa/recovery-codes/regenerate')
      .set('Cookie', registerResponse.headers['set-cookie'])
      .send({ code: '123456' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('MFA is not enabled');
  });

  it('rejects disabling MFA when the current password is wrong', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const authCookie = registerResponse.headers['set-cookie'];
    const setupResponse = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Cookie', authCookie);

    await request(app)
      .post('/api/auth/mfa/enable')
      .set('Cookie', authCookie)
      .send({
        code: generateTotpCode(setupResponse.body.secret),
      });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });

    const verifyResponse = await request(app)
      .post('/api/auth/mfa/verify')
      .send({
        challengeToken: loginResponse.body.challengeToken,
        code: generateTotpCode(setupResponse.body.secret),
        method: 'totp',
      });

    const response = await request(app)
      .post('/api/auth/mfa/disable')
      .set('Cookie', verifyResponse.headers['set-cookie'])
      .send({ password: 'wrongpass123' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid password');
  });

  it('supports password recovery and invalidates the old password', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const forgotResponse = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'tony@example.com' });

    expect(forgotResponse.status).toBe(202);
    expect(forgotResponse.body.resetToken).toBeTypeOf('string');

    const resetResponse = await request(app)
      .post('/api/auth/password/reset')
      .send({
        token: forgotResponse.body.resetToken,
        password: 'newpass123',
        confirmPassword: 'newpass123',
      });

    expect(resetResponse.status).toBe(204);

    const oldPasswordLogin = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });
    const newPasswordLogin = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'newpass123',
    });

    expect(oldPasswordLogin.status).toBe(401);
    expect(newPasswordLogin.status).toBe(200);
    expect(newPasswordLogin.body.user.email).toBe('tony@example.com');
  });

  it('returns the same password-recovery response for unknown emails without exposing a token', async () => {
    const response = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'missing@example.com' });

    expect(response.status).toBe(202);
    expect(response.body.message).toBe('If an account exists for that email, recovery instructions were generated.');
    expect(response.body.resetToken).toBeUndefined();
  });

  it('rejects invalid, reused, and expired password reset tokens', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const invalidToken = await request(app)
      .post('/api/auth/password/reset')
      .send({
        token: 'bad-token',
        password: 'newpass123',
        confirmPassword: 'newpass123',
      });

    expect(invalidToken.status).toBe(400);
    expect(invalidToken.body.message).toBe('Reset token is invalid or expired');

    const forgotResponse = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'tony@example.com' });

    const usedResponse = await request(app)
      .post('/api/auth/password/reset')
      .send({
        token: forgotResponse.body.resetToken,
        password: 'newpass123',
        confirmPassword: 'newpass123',
      });

    expect(usedResponse.status).toBe(204);

    const reusedResponse = await request(app)
      .post('/api/auth/password/reset')
      .send({
        token: forgotResponse.body.resetToken,
        password: 'anotherpass123',
        confirmPassword: 'anotherpass123',
      });

    expect(reusedResponse.status).toBe(400);
    expect(reusedResponse.body.message).toBe('Reset token is invalid or expired');

    const secondForgot = await request(app)
      .post('/api/auth/password/forgot')
      .send({ email: 'tony@example.com' });

    await prisma.passwordResetToken.updateMany({
      where: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'tony@example.com' } })).id, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expiredResponse = await request(app)
      .post('/api/auth/password/reset')
      .send({
        token: secondForgot.body.resetToken,
        password: 'freshpass123',
        confirmPassword: 'freshpass123',
      });

    expect(expiredResponse.status).toBe(400);
    expect(expiredResponse.body.message).toBe('Reset token is invalid or expired');
  });
});

