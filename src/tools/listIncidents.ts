import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { optionalNonEmptyStringArraySchema } from '../coerceArrays';
import { zIncidentStatusListFilter, zIncludeDrills } from '../incidentZod';
import { INCIDENT_CATEGORIES, type IncidentCategory, type IncidentStatus } from '../types';

type ListIncidentsInput = {
  status?: IncidentStatus;
  severity?: number;
  declareSource?: 'api' | 'slack' | 'manual';
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'status' | 'severity' | 'category';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
  q?: string;
  tags?: string[];
  category?: IncidentCategory[];
  includeDrills?: boolean;
};

const inputSchema = z.object({
  status: zIncidentStatusListFilter.optional().describe(
    'Filter by incident status (matches stored statuses, including cancelled)',
  ),
  severity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Filter by severity level (1=critical, 5=lowest)'),
  declareSource: z
    .enum(['api', 'slack', 'manual'])
    .optional()
    .describe('Filter by how the incident was declared'),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name', 'status', 'severity', 'category'])
    .optional()
    .describe('Field to sort results by (default: createdAt)'),
  sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Number of results per page (default: 20)'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from previous response nextCursor field'),
  q: z
    .string()
    .optional()
    .describe('Keyword search (matches name, status, source) — same as Public API list query'),
  tags: optionalNonEmptyStringArraySchema.describe(
    'Categorization tags AND filter: incident must include every tag (repeat tag= in API); array or comma-separated string.',
  ),
  category: z
    .array(z.enum(INCIDENT_CATEGORIES))
    .optional()
    .describe('Category filter (system, security, operational). Match any listed value.'),
  includeDrills: zIncludeDrills,
});

export function registerListIncidents(server: McpServer) {
  server.registerTool(
    'list_incidents',
    {
      description:
        'List incidents for the tenant with optional filtering, sorting, and cursor-based pagination. Use this to browse all incidents or narrow down by status, severity, or source.',
      inputSchema: z.object(inputSchema.shape),
    },
    async (input: ListIncidentsInput) => {
      try {
        const params = new URLSearchParams();
        if (input.status) params.set('status', input.status);
        if (input.severity) params.set('severity', String(input.severity));
        if (input.declareSource) params.set('declareSource', input.declareSource);
        if (input.sortBy) params.set('sortBy', input.sortBy);
        if (input.sortDir) params.set('sortDir', input.sortDir);
        if (input.limit) params.set('limit', String(input.limit));
        if (input.cursor) params.set('cursor', input.cursor);
        if (input.q) params.set('q', input.q);
        if (input.tags) {
          for (const t of input.tags) {
            params.append('tag', t);
          }
        }
        if (input.category) {
          for (const category of input.category) {
            params.append('category', category);
          }
        }
        if (input.includeDrills) params.set('includeDrills', 'true');

        const data = await api.listIncidents(params);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing incidents: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
