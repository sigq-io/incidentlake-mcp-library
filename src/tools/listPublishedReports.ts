import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListPublishedReports(server: McpServer) {
  server.registerTool(
    'list_published_reports',
    {
      description:
        'List published report versions for an incident. Optionally filter by report type: summary, timeline, or postmortem.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        reportType: z
          .enum(['summary', 'timeline', 'postmortem'])
          .optional()
          .describe('Optional filter by section type'),
      }),
    },
    async (input) => {
      try {
        const data = await api.listPublishedReports(input.incidentId, input.reportType);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing published reports: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
