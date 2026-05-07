import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    tag: z.enum(["Engineering", "Open source", "Process", "Craft"]),
    readTime: z.string(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
