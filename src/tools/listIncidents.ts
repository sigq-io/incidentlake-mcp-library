import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

type ListIncidentsInput = {
  status?: 'ongoing' | 'resolved' | 'stalled';
  severity?: number;
  declareSource?: 'api' | 'slack' | 'manual';
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'status' | 'severity';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  cursor?: string;
};

const inputSchema = z.object({
  status: z
    .enum(['ongoing', 'resolved', 'stalled'])
    .optional()
    .describe('Filter by incident status'),
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
    .enum(['createdAt', 'updatedAt', 'name', 'status', 'severity'])
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
}) as z.ZodType<ListIncidentsInput>;

export function registerListIncidents(server: McpServer) {
  server.registerTool(
    'list_incidents',
    {
      description:
        'List incidents for the tenant with optional filtering, sorting, and cursor-based pagination. Use this to browse all incidents or narrow down by status, severity, or source.',
      inputSchema,
    },
    async (input) => {
      const params = new URLSearchParams();
      if (input.status) params.set('status', input.status);
      if (input.severity) params.set('severity', String(input.severity));
      if (input.declareSource) params.set('declareSource', input.declareSource);
      if (input.sortBy) params.set('sortBy', input.sortBy);
      if (input.sortDir) params.set('sortDir', input.sortDir);
      if (input.limit) params.set('limit', String(input.limit));
      if (input.cursor) params.set('cursor', input.cursor);

      const data = await api.listIncidents(params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}
