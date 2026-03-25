import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    home: defineCollection({
      // Specify the type of content in this collection
      type: 'page',
      // Load every file inside the `content` directory
      source: 'index.md',
    }),
    decisions: defineCollection({
      type: 'page',
      source: 'aks/decisions/**/*.md',
      schema: z.object({
        title: z.string(),
        spec: z.object({
          title: z.string(),
          description: z.string(),
          question: z.string(),
          question_type: z.enum(['radio', 'text', 'checkbox']),
          reference: z.object({
            title: z.string(),
            url: z.string()
          }).optional(),
          answers: z.array(z.object({
            key: z.string(),
            label: z.string(),
            description: z.string().optional(),
            highlights: z.array(z.string()).optional(),
            tag: z.object({
              text: z.string(),
              color: z.string().optional(),
              variant: z.string().optional()
            }).optional(),
            disabled: z.boolean().optional(),
            waf_impact: z.object({
              reliability: z.number().optional(),
              security: z.number().optional(),
              cost: z.number().optional(),
              operations: z.number().optional(),
              performance: z.number().optional()
            })
          }))
        })
      })
    }),
    requirements: defineCollection({
      type: 'page',
      source: 'aks/requirements/**/*.md',
      schema: z.object({
        title: z.string(),
        spec: z.object({
          title: z.string(),
          question: z.string(),
          description: z.string().optional(),
          question_type: z.enum(['radio', 'checkbox']),
          answers: z.array(z.object({
            key: z.string(),
            label: z.string(),
            description: z.string().optional(),
            implications: z.array(z.record(z.string(), z.string())).optional(),
            waf_baseline: z.object({
              reliability: z.number().optional(),
              security: z.number().optional(),
              cost: z.number().optional(),
              operations: z.number().optional(),
              performance: z.number().optional()
            })
          }))
        })
      })
    }),
    systemPrompt: defineCollection({
      type: 'page',
      source: 'system-prompt/*.md',
      schema: z.object({
        domain: z.string(),
      })
    }),
    guide: defineCollection({
      type: 'page',
      source: 'guide/**/*.md',
    })
  }
})
