import { z } from 'zod';

export const createListSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
});

export const updateListSchema = createListSchema;

