import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';
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
    res.status(200).json(data);
  } catch (error) {
    await suspiciousActivityService.recordFailedLogin(req.body.email, getRequestIp(req));
    next(error);
  }
});

authRoutes.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

export { authRoutes };
