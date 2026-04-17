import { Router } from 'express';
import { movieRoutes } from './movieRoutes.js';
import { listRoutes } from './listRoutes.js';
import { statisticsRoutes } from './statisticsRoutes.js';
import { authRoutes } from './authRoutes.js';
import { generatorRoutes } from './generatorRoutes.js';

const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

apiRoutes.use('/movies', movieRoutes);
apiRoutes.use('/lists', listRoutes);
apiRoutes.use('/statistics', statisticsRoutes);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/generator', generatorRoutes);

export { apiRoutes };

