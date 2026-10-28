import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
const status = z.enum(['established', 'undecided', 'speculative']);
const evidence = z.array(z.string()).min(1);
const entities = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/entities', generateId: ({ data }) => String(data.id) }),
  schema: z.object({
    id: z.string(), kind: z.enum(['project','character','faction','event','context','location','lore']),
    slug: z.string(), title: z.string(), summary: z.string(), status,
    pageMode: z.enum(['full','preview','context']), sourceRefs: evidence,
    imageIds: z.array(z.string()).default([]), aliases: z.array(z.string()).default([]),
    eyebrow: z.string().default(''), symbol: z.string().default('X'),
    sagaOrder: z.number().optional(), year: z.number().optional(), actRole: z.string().optional(),
    projectId: z.string().optional(), order: z.number().optional(), provisional: z.boolean().default(false),
    filmColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    directoryGroup: z.enum(['original','mentor','brotherhood','later','central','supporting','antagonists','morlocks']).optional(),
    narrativeOrder: z.number().positive().optional(),
    premiseEventIds: z.array(z.string()).default([]),
    beats: z.array(z.object({
      id:z.string(), title:z.string(), status:z.enum(['present','not-established']),
      paragraphs:z.array(z.string()), eventIds:z.array(z.string()).default([]),
      sourceRefs:evidence, sourceNote:z.string(), legacyIds:z.array(z.string()).default([]),
    })).default([]),
    quickBio: z.array(z.object({ label:z.string(), text:z.string() })).default([]),
    sections: z.array(z.object({ id:z.string(), title:z.string(), paragraphs:z.array(z.string()), eventIds:z.array(z.string()).default([]), sourceRefs:evidence })).default([]),
    journey: z.array(z.object({ projectId:z.string(), label:z.string(), text:z.string(), status:status.default('established'), eventIds:z.array(z.string()).default([]), sourceRefs:evidence })).default([]),
  })
});
const relationships = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/relationships', generateId: ({ data }) => String(data.id) }),
  schema: z.object({ id: z.string(), fromId: z.string(), toId: z.string(),
    kind: z.enum(['appears-in','affects','member-of','participates-in','integrates-with','occurs-in']),
    label: z.string(), status, sourceRefs: evidence,
    eventIds: z.array(z.string()).default([]), timing: z.string().optional(), castOrder:z.number().positive().optional() })
});
const issues = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/issues', generateId: ({ data }) => String(data.id) }),
  schema: z.object({id:z.string(),title:z.string(),subjectIds:z.array(z.string()).min(1),status,note:z.string(),sourceRefs:evidence})
});
export const collections = { entities, relationships, issues };
