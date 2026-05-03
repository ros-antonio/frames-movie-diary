import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';
import { authService } from '../services/authService.js';

const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema, 'body'), async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

authRoutes.post('/login', validate(loginSchema, 'body'), async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

export { authRoutes };