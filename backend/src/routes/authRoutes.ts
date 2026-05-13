import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  mfaDisableSchema,
  mfaSetupVerifySchema,
  mfaVerifySchema,
  passwordForgotSchema,
  passwordResetSchema,
  registerSchema,
} from '../validators/authSchemas.js';
import { authService } from '../services/authService.js';
import { auditLogService } from '../services/auditLogService.js';
import { suspiciousActivityService } from '../services/suspiciousActivityService.js';
import { getRequestIp } from '../utils/requestMetadata.js';
import { clearAuthCookie, setAuthCookie } from '../utils/authSession.js';

const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema, 'body'), async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    setAuthCookie(res, data.token);
    await auditLogService.log({
      userId: data.user.id,
      roleName: data.user.role,
      actionType: 'AUTH_REGISTER',
      entityType: 'USER',
      entityId: data.user.id,
      details: `Registered account for ${data.user.email}`,
      ipAddress: getRequestIp(req),
    });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/login', validate(loginSchema, 'body'), async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    if ('token' in data) {
      setAuthCookie(res, data.token);
      await auditLogService.log({
        userId: data.user.id,
        roleName: data.user.role,
        actionType: 'AUTH_LOGIN',
        entityType: 'USER',
        entityId: data.user.id,
        details: `Logged in as ${data.user.email}`,
        ipAddress: getRequestIp(req),
      });
    } else {
      await auditLogService.log({
        userId: data.user.id,
        roleName: data.user.role,
        actionType: 'AUTH_MFA_CHALLENGE_ISSUED',
        entityType: 'USER',
        entityId: data.user.id,
        details: `Issued MFA challenge for ${data.user.email}`,
        ipAddress: getRequestIp(req),
      });
    }

    res.status(200).json(data);
  } catch (error) {
    await suspiciousActivityService.recordFailedLogin(req.body.email, getRequestIp(req));
    next(error);
  }
});

authRoutes.post('/mfa/verify', validate(mfaVerifySchema, 'body'), async (req, res, next) => {
  try {
    const data = await authService.verifyMfaChallenge(req.body);
    setAuthCookie(res, data.token);
    await auditLogService.log({
      userId: data.user.id,
      roleName: data.user.role,
      actionType: 'AUTH_MFA_LOGIN',
      entityType: 'USER',
      entityId: data.user.id,
      details: `Completed MFA login as ${data.user.email}`,
      ipAddress: getRequestIp(req),
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

authRoutes.get('/session', async (req, res, next) => {
  try {
    const user = await authService.getSessionUser(req.user!.userId);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
});

authRoutes.get('/security', async (req, res, next) => {
  try {
    res.status(200).json(await authService.getSecurityState(req.user!.userId));
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/mfa/setup', async (req, res, next) => {
  try {
    const setup = await authService.beginMfaEnrollment(req.user!.userId);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'AUTH_MFA_SETUP_STARTED',
      entityType: 'USER',
      entityId: req.user!.userId,
      details: 'Started MFA setup',
      ipAddress: getRequestIp(req),
    });
    res.status(200).json(setup);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/mfa/enable', validate(mfaSetupVerifySchema, 'body'), async (req, res, next) => {
  try {
    const payload = await authService.completeMfaEnrollment(req.user!.userId, req.body.code);
    clearAuthCookie(res);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'AUTH_MFA_ENABLED',
      entityType: 'USER',
      entityId: req.user!.userId,
      details: 'Enabled MFA and rotated recovery codes',
      ipAddress: getRequestIp(req),
    });
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/mfa/recovery-codes/regenerate', validate(mfaSetupVerifySchema, 'body'), async (req, res, next) => {
  try {
    const payload = await authService.regenerateRecoveryCodes(req.user!.userId, req.body.code);
    clearAuthCookie(res);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'AUTH_MFA_RECOVERY_CODES_REGENERATED',
      entityType: 'USER',
      entityId: req.user!.userId,
      details: 'Regenerated MFA recovery codes',
      ipAddress: getRequestIp(req),
    });
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/mfa/disable', validate(mfaDisableSchema, 'body'), async (req, res, next) => {
  try {
    await authService.disableMfa(req.user!.userId, req.body.password);
    clearAuthCookie(res);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'AUTH_MFA_DISABLED',
      entityType: 'USER',
      entityId: req.user!.userId,
      details: 'Disabled MFA',
      ipAddress: getRequestIp(req),
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/password/forgot', validate(passwordForgotSchema, 'body'), async (req, res, next) => {
  try {
    const payload = await authService.requestPasswordReset(req.body);
    await auditLogService.log({
      userId: null,
      roleName: 'ANONYMOUS',
      actionType: 'AUTH_PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      details: `Password reset requested for ${req.body.email}`,
      ipAddress: getRequestIp(req),
    });
    res.status(202).json(payload);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/password/reset', validate(passwordResetSchema, 'body'), async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    clearAuthCookie(res);
    await auditLogService.log({
      userId: null,
      roleName: 'ANONYMOUS',
      actionType: 'AUTH_PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      details: 'Completed password reset',
      ipAddress: getRequestIp(req),
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

export { authRoutes };
