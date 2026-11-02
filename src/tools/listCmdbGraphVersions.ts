import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListCmdbGraphVersions(server: McpServer) {
  server.registerTool(
    'list_cmdb_graph_versions',
    {
      description:
        'List published CMDB graph versions, newest first. Excludes each version\'s snapshot payload — ' +
        'use get_cmdb_graph_version_detail to fetch one.',
      inputSchema: z.object({
        page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Results per page, 1-100 (default: 50)'),
      }),
    },
    async (input) => {
      try {
        const params = new URLSearchParams();
        if (input.page !== undefined) params.set('page', String(input.page));
        if (input.limit !== undefined) params.set('limit', String(input.limit));
        const data = await api.listCmdbGraphVersions(params.size ? params : undefined);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error listing CMDB graph versions: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
