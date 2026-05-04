import { Router } from 'express';
import { listService } from '../services/listService.js';
import { validate } from '../middleware/validate.js';
import { paginationQuerySchema, listIdParamSchema, listMovieParamsSchema } from '../validators/commonSchemas.js';
import { createListSchema, updateListSchema } from '../validators/listSchemas.js';
import { getPaginationQuery } from '../utils/pagination.js';
import { auditLogService } from '../services/auditLogService.js';
import { suspiciousActivityService } from '../services/suspiciousActivityService.js';
import { getRequestIp } from '../utils/requestMetadata.js';

const listRoutes = Router();

listRoutes.get('/', validate(paginationQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, pageSize } = getPaginationQuery(req.query);
    res.status(200).json(await listService.list(page, pageSize, req.user!.userId, req.user!.role));
  } catch (error) {
    next(error);
  }
});

listRoutes.post('/', validate(createListSchema, 'body'), async (req, res, next) => {
  try {
    const list = await listService.create(req.body, req.user!.userId);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'LIST_CREATE',
      entityType: 'LIST',
      entityId: list.id,
      details: `Created list "${list.name}"`,
      ipAddress: getRequestIp(req),
    });
    res.status(201).json(list);
  } catch (error) {
    next(error);
  }
});

listRoutes.get('/:listId', validate(listIdParamSchema, 'params'), async (req, res, next) => {
  try {
    res.status(200).json(await listService.getById(req.params.listId, req.user!.userId, req.user!.role));
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
      const list = await listService.update(req.params.listId, req.body, req.user!.userId, req.user!.role);
      await auditLogService.log({
        userId: req.user!.userId,
        roleName: req.user!.role,
        actionType: 'LIST_UPDATE',
        entityType: 'LIST',
        entityId: list.id,
        details: `Updated list "${list.name}"`,
        ipAddress: getRequestIp(req),
      });
      res.status(200).json(list);
    } catch (error) {
      next(error);
    }
  },
);

listRoutes.delete('/:listId', validate(listIdParamSchema, 'params'), async (req, res, next) => {
  try {
    await listService.delete(req.params.listId, req.user!.userId, req.user!.role);
    await auditLogService.log({
      userId: req.user!.userId,
      roleName: req.user!.role,
      actionType: 'LIST_DELETE',
      entityType: 'LIST',
      entityId: req.params.listId,
      details: `Deleted list ${req.params.listId}`,
      ipAddress: getRequestIp(req),
    });
    await suspiciousActivityService.evaluateDeleteActivity(req.user!.userId);
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
      const list = await listService.addMovie(req.params.listId, req.params.movieId, req.user!.userId, req.user!.role);
      await auditLogService.log({
        userId: req.user!.userId,
        roleName: req.user!.role,
        actionType: 'LIST_ADD_MOVIE',
        entityType: 'LIST',
        entityId: list.id,
        details: `Added movie ${req.params.movieId} to list ${req.params.listId}`,
        ipAddress: getRequestIp(req),
      });
      res.status(200).json(list);
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
      const list = await listService.removeMovie(req.params.listId, req.params.movieId, req.user!.userId, req.user!.role);
      await auditLogService.log({
        userId: req.user!.userId,
        roleName: req.user!.role,
        actionType: 'LIST_REMOVE_MOVIE',
        entityType: 'LIST',
        entityId: list.id,
        details: `Removed movie ${req.params.movieId} from list ${req.params.listId}`,
        ipAddress: getRequestIp(req),
      });
      res.status(200).json(list);
    } catch (error) {
      next(error);
    }
  },
);

export { listRoutes };
