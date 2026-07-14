import { z } from 'zod'

// Validation for admin-edited course content. Mirrors the shapes in
// src/lib/praxo/types.ts that the plan generator and clients consume.

export const surveySchema = z.object({
  intro: z.string(),
  questions: z.array(
    z.object({
      id: z.string().min(1),
      question: z.string().min(1),
      type: z.enum(['single_choice', 'multi_choice', 'text']),
      options: z.array(z.string()).optional(),
      required: z.boolean(),
    })
  ),
})

export const templateSchema = z.object({
  teacherPersona: z.string().min(10),
  steps: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        goal: z.string().min(1),
        baseInstructions: z.string().min(1),
        gate: z.string().min(5),
        skipIf: z.record(z.string(), z.array(z.string())).optional(),
      })
    )
    .min(1),
})

export const courseCreateSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, and dashes only'),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(500),
  coverEmoji: z.string().max(8).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  survey: surveySchema,
  planTemplate: templateSchema,
})

export const courseUpdateSchema = courseCreateSchema.partial()

export const chunkSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(20).max(8000),
  stepTags: z.array(z.string()).default([]),
})
