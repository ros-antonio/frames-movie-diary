import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { fakeDataGeneratorService } from '../services/fakeDataGeneratorService.js';

const startGeneratorSchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(25).default(3),
  intervalMs: z.coerce.number().int().min(100).max(60_000).default(3_000),
});

const generatorRoutes = Router();

generatorRoutes.get('/status', (_req, res) => {
  res.status(200).json(fakeDataGeneratorService.getStatus());
});

generatorRoutes.post('/start', validate(startGeneratorSchema, 'body'), (req, res) => {
  const result = fakeDataGeneratorService.start(req.body);
  res.status(result.started ? 200 : 409).json(result);
});

generatorRoutes.post('/stop', (_req, res) => {
  const result = fakeDataGeneratorService.stop();
  res.status(result.stopped ? 200 : 409).json(result);
});

export { generatorRoutes };

