import { defineCollection, z } from 'astro:content';

const writing = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    updated: z.string().optional(),
    draft: z.boolean().default(false),
  })
});

const notes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    updated: z.string().optional(),
    draft: z.boolean().default(false),
  })
});

export const collections = { writing, notes };
