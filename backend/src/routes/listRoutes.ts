import { Router } from 'express';
import { listService } from '../services/listService.js';
import { validate } from '../middleware/validate.js';
import { paginationQuerySchema, listIdParamSchema, listMovieParamsSchema } from '../validators/commonSchemas.js';
import { createListSchema, updateListSchema } from '../validators/listSchemas.js';
import { getPaginationQuery } from '../utils/pagination.js';

const listRoutes = Router();

listRoutes.get('/', validate(paginationQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, pageSize } = getPaginationQuery(req.query);
    res.status(200).json(await listService.list(page, pageSize));
  } catch (error) {
    next(error);
  }
});

listRoutes.post('/', validate(createListSchema, 'body'), async (req, res, next) => {
  try {
    const list = await listService.create(req.body);
    res.status(201).json(list);
  } catch (error) {
    next(error);
  }
});

listRoutes.get('/:listId', validate(listIdParamSchema, 'params'), async (req, res, next) => {
  try {
    res.status(200).json(await listService.getById(req.params.listId));
  } catch (error) {
    next(error);
  }
});

listRoutes.put(
  '/:listId',
  validate(listIdParamSchema, 'params'),
  validate(updateListSchema, 'body'),
  async (req, res, next) => {
    try {
      res.status(200).json(await listService.update(req.params.listId, req.body));
    } catch (error) {
      next(error);
    }
  },
);

listRoutes.delete('/:listId', validate(listIdParamSchema, 'params'), async (req, res, next) => {
  try {
    await listService.delete(req.params.listId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

listRoutes.post(
  '/:listId/movies/:movieId',
  validate(listMovieParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      res.status(200).json(await listService.addMovie(req.params.listId, req.params.movieId));
    } catch (error) {
      next(error);
    }
  },
);

listRoutes.delete(
  '/:listId/movies/:movieId',
  validate(listMovieParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      res.status(200).json(await listService.removeMovie(req.params.listId, req.params.movieId));
    } catch (error) {
      next(error);
    }
  },
);

export { listRoutes };
