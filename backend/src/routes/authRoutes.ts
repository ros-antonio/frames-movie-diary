import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';
import { authService } from '../services/authService.js';

const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema, 'body'), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/login', validate(loginSchema, 'body'), async (req, res, next) => {
  try {
    const user = await authService.login(req.body);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

export { authRoutes };
