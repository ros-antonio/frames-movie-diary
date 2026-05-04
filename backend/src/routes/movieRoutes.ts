import { Router } from 'express';
import { movieService } from '../services/movieService.js';
import { validate } from '../middleware/validate.js';
import { paginationQuerySchema, movieIdParamSchema, movieFrameParamsSchema } from '../validators/commonSchemas.js';
import { createMovieSchema, updateMovieSchema, createFrameSchema } from '../validators/movieSchemas.js';
import { getPaginationQuery } from '../utils/pagination.js';
import { auditLogService } from '../services/auditLogService.js';
import { suspiciousActivityService } from '../services/suspiciousActivityService.js';
import { getRequestIp } from '../utils/requestMetadata.js';

const movieRoutes = Router();

movieRoutes.get('/', validate(paginationQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, pageSize } = getPaginationQuery(req.query);
    res.status(200).json(await movieService.list(page, pageSize, req.user!.userId, req.user!.role));
  } catch (error) {
    next(error);
  }
});

movieRoutes.post('/', validate(createMovieSchema, 'body'), async (req, res, next) => {
  try {
    const movie = await movieService.create(req.body, req.user!.userId);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'MOVIE_CREATE',
      entityType: 'MOVIE',
      entityId: movie.id,
      details: `Created movie "${movie.movieName}"`,
      ipAddress: getRequestIp(req),
    });
    res.status(201).json(movie);
  } catch (error) {
    next(error);
  }
});

movieRoutes.get('/:movieId', validate(movieIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { movieId } = req.params;
    res.status(200).json(await movieService.getById(movieId, req.user!.userId, req.user!.role));
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
      const movie = await movieService.update(movieId, req.body, req.user!.userId, req.user!.role);
      await auditLogService.log({
        userId: req.user!.userId,
        roleName: req.user!.role,
        actionType: 'MOVIE_UPDATE',
        entityType: 'MOVIE',
        entityId: movie.id,
        details: `Updated movie "${movie.movieName}"`,
        ipAddress: getRequestIp(req),
      });
      res.status(200).json(movie);
    } catch (error) {
      next(error);
    }
  },
);

movieRoutes.delete('/:movieId', validate(movieIdParamSchema, 'params'), async (req, res, next) => {
  try {
    const { movieId } = req.params;
    await movieService.delete(movieId, req.user!.userId, req.user!.role);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'MOVIE_DELETE',
      entityType: 'MOVIE',
      entityId: movieId,
      details: `Deleted movie ${movieId}`,
      ipAddress: getRequestIp(req),
    });
    await suspiciousActivityService.evaluateDeleteActivity(req.user!.userId);
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
      const frame = await movieService.addFrame(req.params.movieId, req.body, req.user!.userId, req.user!.role);
      await auditLogService.log({
        userId: req.user!.userId,
        roleName: req.user!.role,
        actionType: 'FRAME_CREATE',
        entityType: 'FRAME',
        entityId: frame.id,
        details: `Added frame to movie ${req.params.movieId}`,
        ipAddress: getRequestIp(req),
      });
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
      await movieService.deleteFrame(req.params.movieId, req.params.frameId, req.user!.userId, req.user!.role);
      await auditLogService.log({
        userId: req.user!.userId,
        roleName: req.user!.role,
        actionType: 'FRAME_DELETE',
        entityType: 'FRAME',
        entityId: req.params.frameId,
        details: `Deleted frame from movie ${req.params.movieId}`,
        ipAddress: getRequestIp(req),
      });
      await suspiciousActivityService.evaluateDeleteActivity(req.user!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export { movieRoutes };
