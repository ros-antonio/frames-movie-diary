import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { userService } from '../services/userService.js';

const userRoutes = Router();

userRoutes.get('/', authorize('ADMIN'), async (_req, res, next) => {
  try {
    res.status(200).json(await userService.listUsers());
  } catch (error) {
    next(error);
  }
});

export { userRoutes };
