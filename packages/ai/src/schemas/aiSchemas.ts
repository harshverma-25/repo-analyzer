import { z } from 'zod';

export const AISummaryResponseSchema = z.object({
  overview: z.string().min(10),
  keyFeatures: z.array(z.string()).min(1),
  architectureOverview: z.string().min(10),
  moduleHighlights: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      keyFiles: z.array(z.string()),
    })
  ),
  suggestedExplorationPaths: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      entryFile: z.string(),
    })
  ),
  securitySummary: z.string(),
});

export type AISummaryResponse = z.infer<typeof AISummaryResponseSchema>;

export const AIExplainResponseSchema = z.object({
  answer: z.string().min(5),
  referencedFiles: z.array(z.string()).default([]),
});
