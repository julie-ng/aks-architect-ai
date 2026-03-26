import { z } from 'zod'

export const createSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  designId: z.string().uuid().optional(),
})

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(200),
})

export const appendMessagesSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(z.unknown()), // AI SDK UIMessage structure — owned by AI SDK, not validated further
    metadata: z.record(z.string(), z.unknown()).nullable().optional(), // AI SDK metadata — opaque to our schema
  })),
})
