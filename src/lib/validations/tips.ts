import { z } from "zod";

export const createTipSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  body: z.string().min(1, "Body is required").max(5000),
  emoji: z.string().max(10).optional().nullable(),
  display_context: z.enum(["study_sidebar"]).default("study_sidebar"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  word_ids: z.array(z.string().uuid()).default([]),
});

export type CreateTipInput = z.input<typeof createTipSchema>;

export const updateTipSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  body: z.string().min(1, "Body is required").max(5000).optional(),
  emoji: z.string().max(10).optional().nullable(),
  display_context: z.enum(["study_sidebar"]).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  word_ids: z.array(z.string().uuid()).optional(),
});

export type UpdateTipInput = z.input<typeof updateTipSchema>;
