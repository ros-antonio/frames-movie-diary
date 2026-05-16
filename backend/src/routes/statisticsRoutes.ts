import { Router } from 'express';
import { authorizePermissions } from '../middleware/auth.js';
import { statisticsService } from '../services/statisticsService.js';

const statisticsRoutes = Router();

statisticsRoutes.get('/overview', async (req, res, next) => {
  try {
    res.status(200).json(await statisticsService.getOverview(req.user!.userId, req.user!.role));
  } catch (error) {
    next(error);
  }
});

statisticsRoutes.get('/list-overlaps', authorizePermissions('ADMIN_VIEW_USERS'), async (_req, res, next) => {
  try {
    res.status(200).json(await statisticsService.getTopListOverlaps());
  } catch (error) {
    next(error);
  }
});

statisticsRoutes.get('/list-overlaps-naive', authorizePermissions('ADMIN_VIEW_USERS'), async (_req, res, next) => {
  try {
    res.status(200).json(await statisticsService.getTopListOverlapsNaive());
  } catch (error) {
    next(error);
  }
});

export { statisticsRoutes };
