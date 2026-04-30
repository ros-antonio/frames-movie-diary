import { Router } from 'express';
import { movieService } from '../services/movieService.js';
import { validate } from '../middleware/validate.js';
import { paginationQuerySchema, movieIdParamSchema, movieFrameParamsSchema } from '../validators/commonSchemas.js';
import { createMovieSchema, updateMovieSchema, createFrameSchema } from '../validators/movieSchemas.js';
import { getPaginationQuery } from '../utils/pagination.js';

const movieRoutes = Router();

movieRoutes.get('/', validate(paginationQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, pageSize } = getPaginationQuery(req.query);
    res.status(200).json(await movieService.list(page, pageSize, req.userId!));
  } catch (error) {
    next(error);
  }
});

movieRoutes.post('/', validate(createMovieSchema, 'body'), async (req, res, next) => {
  try {
    const movie = await movieService.create(req.body, req.userId!);
    res.status(201).json(movie);
  } catch (error) {
    next(error);
  }
});

movieRoutes.get('/:movieId', validate(movieIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { movieId } = req.params;
    res.status(200).json(await movieService.getById(movieId, req.userId!));
  } catch (error) {
    next(error);
  }
});

movieRoutes.put(
    '/:movieId',
    validate(movieIdParamSchema, 'params'),
    validate(updateMovieSchema, 'body'),
    async (req, res, next) => {
      try {
        const { movieId } = req.params;
        res.status(200).json(await movieService.update(movieId, req.body, req.userId!));
      } catch (error) {
        next(error);
      }
    },
);

movieRoutes.delete('/:movieId', validate(movieIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { movieId } = req.params;
    await movieService.delete(movieId, req.userId!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

movieRoutes.post(
    '/:movieId/frames',
    validate(movieIdParamSchema, 'params'),
    validate(createFrameSchema, 'body'),
    async (req, res, next) => {
      try {
        const frame = await movieService.addFrame(req.params.movieId, req.body, req.userId!);
        res.status(201).json(frame);
      } catch (error) {
        next(error);
      }
    },
);

movieRoutes.delete(
    '/:movieId/frames/:frameId',
    validate(movieFrameParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        await movieService.deleteFrame(req.params.movieId, req.params.frameId, req.userId!);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
);

export { movieRoutes };