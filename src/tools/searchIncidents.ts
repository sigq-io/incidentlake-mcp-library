import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { optionalNonEmptyStringArraySchema } from '../coerceArrays';

export function registerSearchIncidents(server: McpServer) {
  server.registerTool(
    'search_incidents',
    {
      description:
        'Search incidents by keyword. Matches against incident name, status, and declare source. Use this when the user wants to find incidents by descriptive text.',
      inputSchema: z.object({
        query: z.string().min(1).max(500).describe('Search keyword or phrase'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum number of results to return (default: 10)'),
        tags: optionalNonEmptyStringArraySchema.describe(
          'Optional categorization tags AND filter (must match all); array or comma-separated string.',
        ),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchIncidents(input.query, input.limit, input.tags);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching incidents: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
