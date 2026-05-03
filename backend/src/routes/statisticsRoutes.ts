import { Router } from 'express';
import { statisticsService } from '../services/statisticsService.js';

const statisticsRoutes = Router();

statisticsRoutes.get('/overview', async (req, res, next) => {
  try {
    res.status(200).json(await statisticsService.getOverview(req.user!.userId, req.user!.role));
  } catch (error) {
    next(error);
  }
});

export { statisticsRoutes };