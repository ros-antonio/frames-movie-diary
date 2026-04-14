import { Router } from 'express';
import { movieService } from '../services/movieService.js';
import { validate } from '../middleware/validate.js';
import { paginationQuerySchema, movieIdParamSchema, movieFrameParamsSchema } from '../validators/commonSchemas.js';
import { createMovieSchema, updateMovieSchema, createFrameSchema } from '../validators/movieSchemas.js';

const movieRoutes = Router();

movieRoutes.get('/', validate(paginationQuerySchema, 'query'), (req, res) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  res.status(200).json(movieService.list(page, pageSize));
});

movieRoutes.post('/', validate(createMovieSchema, 'body'), (req, res) => {
  const movie = movieService.create(req.body);
  res.status(201).json(movie);
});

movieRoutes.get('/:movieId', validate(movieIdParamSchema, 'params'), (req, res) => {
  const { movieId } = req.params;
  res.status(200).json(movieService.getById(movieId));
});

movieRoutes.put(
  '/:movieId',
  validate(movieIdParamSchema, 'params'),
  validate(updateMovieSchema, 'body'),
  (req, res) => {
    const { movieId } = req.params;
    res.status(200).json(movieService.update(movieId, req.body));
  },
);

movieRoutes.delete('/:movieId', validate(movieIdParamSchema, 'params'), (req, res) => {
  const { movieId } = req.params;
  movieService.delete(movieId);
  res.status(204).send();
});

movieRoutes.post(
  '/:movieId/frames',
  validate(movieIdParamSchema, 'params'),
  validate(createFrameSchema, 'body'),
  (req, res) => {
    const frame = movieService.addFrame(req.params.movieId, req.body);
    res.status(201).json(frame);
  },
);

movieRoutes.delete(
  '/:movieId/frames/:frameId',
  validate(movieFrameParamsSchema, 'params'),
  (req, res) => {
    movieService.deleteFrame(req.params.movieId, req.params.frameId);
    res.status(204).send();
  },
);

export { movieRoutes };

