import { z } from 'zod'

const selectionValue = z.union([z.string(), z.array(z.string()), z.null()])
const selectionsMap = z.record(z.string(), z.union([z.string(), z.array(z.string())]))

export const createDesignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  decisions: selectionsMap.optional(),
  requirements: selectionsMap.optional(),
})

export const updateDesignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
})

export const updateSelectionSchema = z.object({
  key: z.string().min(1),
  value: selectionValue,
})
