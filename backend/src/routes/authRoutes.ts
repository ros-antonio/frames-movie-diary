import { Router } from 'express';
import type { Response } from 'express';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';
import { authService } from '../services/authService.js';

const authRoutes = Router();
const authCookieName = 'frames_auth';
const oneDayInMs = 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, token: string) {
  res.cookie(authCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: oneDayInMs,
    path: '/',
  });
}

authRoutes.post('/register', validate(registerSchema, 'body'), async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    setAuthCookie(res, data.token);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/login', validate(loginSchema, 'body'), async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    setAuthCookie(res, data.token);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

export { authRoutes };
