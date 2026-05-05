import { Router } from 'express';
import { chatService } from '../services/chatService.js';
import { userService } from '../services/userService.js';

const chatRoutes = Router();

chatRoutes.get('/users', async (req, res, next) => {
  try {
    res.status(200).json(await userService.listChatUsers(req.user!.userId));
  } catch (error) {
    next(error);
  }
});

chatRoutes.get('/messages/:otherUserId', async (req, res, next) => {
  try {
    res.status(200).json(await chatService.listConversationMessages(req.user!.userId, req.params.otherUserId));
  } catch (error) {
    next(error);
  }
});

export { chatRoutes };
