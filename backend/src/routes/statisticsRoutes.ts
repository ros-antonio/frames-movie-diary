import { Router } from 'express';
import { statisticsService } from '../services/statisticsService.js';

const statisticsRoutes = Router();

statisticsRoutes.get('/overview', async (_req, res, next) => {
  try {
    res.status(200).json(await statisticsService.getOverview());
  } catch (error) {
    next(error);
  }
});

export { statisticsRoutes };
