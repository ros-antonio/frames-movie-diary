import { Router } from 'express';
import { listService } from '../services/listService.js';
import { validate } from '../middleware/validate.js';
import { paginationQuerySchema, listIdParamSchema, listMovieParamsSchema } from '../validators/commonSchemas.js';
import { createListSchema, updateListSchema } from '../validators/listSchemas.js';
import { getPaginationQuery } from '../utils/pagination.js';

const listRoutes = Router();

listRoutes.get('/', validate(paginationQuerySchema, 'query'), (req, res) => {
  const { page, pageSize } = getPaginationQuery(req.query);
  res.status(200).json(listService.list(page, pageSize));
});

listRoutes.post('/', validate(createListSchema, 'body'), (req, res) => {
  const list = listService.create(req.body);
  res.status(201).json(list);
});

listRoutes.get('/:listId', validate(listIdParamSchema, 'params'), (req, res) => {
  res.status(200).json(listService.getById(req.params.listId));
});

listRoutes.put(
  '/:listId',
  validate(listIdParamSchema, 'params'),
  validate(updateListSchema, 'body'),
  (req, res) => {
    res.status(200).json(listService.update(req.params.listId, req.body));
  },
);

listRoutes.delete('/:listId', validate(listIdParamSchema, 'params'), (req, res) => {
  listService.delete(req.params.listId);
  res.status(204).send();
});

listRoutes.post(
  '/:listId/movies/:movieId',
  validate(listMovieParamsSchema, 'params'),
  (req, res) => {
    res.status(200).json(listService.addMovie(req.params.listId, req.params.movieId));
  },
);

listRoutes.delete(
  '/:listId/movies/:movieId',
  validate(listMovieParamsSchema, 'params'),
  (req, res) => {
    res.status(200).json(listService.removeMovie(req.params.listId, req.params.movieId));
  },
);

export { listRoutes };

