import { Router } from 'express';
import { authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userService } from '../services/userService.js';
import { userIdParamSchema } from '../validators/commonSchemas.js';

const userRoutes = Router();

userRoutes.get('/', authorize('ADMIN'), async (_req, res, next) => {
  try {
    res.status(200).json(await userService.listUsers());
  } catch (error) {
    next(error);
  }
});

userRoutes.delete('/:id', authorize('ADMIN'), validate(userIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user!.userId);
    res.status(200).json({
      message: 'User deleted successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

export { userRoutes };
