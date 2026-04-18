import express from 'express';
import cors from 'cors';
import { createHandler } from 'graphql-http/lib/use/express';
import { graphQLSchema } from './graphql/schema.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/graphql', createHandler({ schema: graphQLSchema }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

