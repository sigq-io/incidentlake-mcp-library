import { z } from 'zod';
import type { ApiToolDefinition } from './defineApiTool';

const knowledgeId = z.string().uuid().describe('Knowledge item UUID');
const classificationText = (what: string) =>
  z.string().max(20_000).nullable().optional().describe(`${what} (null or empty clears)`);

export const knowledgeTools: ApiToolDefinition[] = [
  {
    name: 'import_knowledge_items_csv',
    description:
      'Import knowledge items from CSV text (header row plus data rows). Valid rows are queued for background creation; row-level validation errors are returned immediately.',
    method: 'POST',
    path: '/v1/knowledge/import',
    input: {
      csv: z.string().min(1).describe('Full CSV text, UTF-8'),
    },
  },
  {
    name: 'semantic_search_knowledge',
    description:
      'Natural-language (vector) search over active knowledge items. Returns matches with similarity scores. Use search_knowledge_items for keyword search.',
    method: 'POST',
    path: '/v1/knowledge/semantic-search',
    retries: 2,
    input: {
      query: z.string().min(1).describe('Question or description to search for'),
      limit: z.number().int().min(1).max(20).optional().describe('Maximum results (max 20)'),
    },
  },
  {
    name: 'search_knowledge_tags',
    description: 'Search knowledge tag names. Omit q to list tags.',
    method: 'GET',
    path: '/v1/knowledge/tags/search',
    input: {
      q: z.string().optional().describe('Text the tag contains'),
    },
  },
  {
    name: 'get_knowledge_settings',
    description: 'Get the knowledge review settings (review cycle in days).',
    method: 'GET',
    path: '/v1/knowledge-settings',
  },
  {
    name: 'update_knowledge_settings',
    description: 'Set how often knowledge items are due for review. Admin only.',
    method: 'PATCH',
    path: '/v1/knowledge-settings',
    input: {
      knowledgeReviewCycleDays: z
        .union([z.literal(7), z.literal(30), z.literal(60), z.literal(90)])
        .describe('Review cycle in days: 7, 30, 60 or 90'),
    },
  },
  {
    name: 'list_knowledge_versions',
    description: 'List the version history of a knowledge item, with the version numbers to restore.',
    method: 'GET',
    path: '/v1/knowledge/{knowledgeId}/versions',
    input: { knowledgeId },
  },
  {
    name: 'restore_knowledge_version',
    description:
      'Make an earlier version the current content of a knowledge item. The restore is recorded as a new version.',
    method: 'POST',
    path: '/v1/knowledge/{knowledgeId}/versions/{versionNumber}/restore',
    input: {
      knowledgeId,
      versionNumber: z.number().int().min(1).describe('Version number from list_knowledge_versions'),
    },
  },
  {
    name: 'list_knowledge_images',
    description: 'List the images attached to a knowledge item (metadata only, no binary).',
    method: 'GET',
    path: '/v1/knowledge/{knowledgeId}/images',
    input: { knowledgeId },
  },
  {
    name: 'update_knowledge_classification',
    description:
      'Set the kind of a knowledge item (article, runbook, known_error, faq) and its known-error fields. Only the fields sent are changed. Returns the item.',
    method: 'PATCH',
    path: '/v1/knowledge/{knowledgeId}/classification',
    input: {
      knowledgeId,
      kind: z.enum(['article', 'runbook', 'known_error', 'faq']).optional().describe('Knowledge kind'),
      symptoms: classificationText('Symptoms'),
      rootCause: classificationText('Root cause'),
      workaround: classificationText('Workaround'),
      affectedServiceIds: z
        .array(z.string().uuid())
        .optional()
        .describe('CMDB service UUIDs affected (replaces the list; [] clears)'),
      riskId: z.string().uuid().nullable().optional().describe('Linked risk (problem) UUID; null clears'),
    },
  },
  {
    name: 'set_knowledge_auto_retrieval',
    description: 'Allow or forbid chat AI to retrieve a knowledge item automatically. Returns the item.',
    method: 'PATCH',
    path: '/v1/knowledge/{knowledgeId}/auto-retrieval',
    input: {
      knowledgeId,
      autoRetrieval: z.boolean().describe('true lets chat AI use the item'),
    },
  },
];
