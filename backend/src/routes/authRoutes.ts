import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';
import { authService } from '../services/authService.js';

const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema, 'body'), (req, res) => {
  const user = authService.register(req.body);
  res.status(201).json(user);
});

authRoutes.post('/login', validate(loginSchema, 'body'), (req, res) => {
  const user = authService.login(req.body);
  res.status(200).json(user);
});

export { authRoutes };

