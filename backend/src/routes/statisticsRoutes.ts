import { Router } from 'express';
import { statisticsService } from '../services/statisticsService.js';

const statisticsRoutes = Router();

statisticsRoutes.get('/overview', (_req, res) => {
  res.status(200).json(statisticsService.getOverview());
});

export { statisticsRoutes };

