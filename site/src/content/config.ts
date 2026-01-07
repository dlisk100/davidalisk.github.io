import { defineCollection, z } from 'astro:content';

const commonSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  updated: z.string().optional(),
  draft: z.boolean().default(false),
});

const writing = defineCollection({
  type: 'content',
  schema: commonSchema,
});

const projects = defineCollection({
  type: 'content',
  schema: commonSchema,
});

export const collections = { writing, projects };
