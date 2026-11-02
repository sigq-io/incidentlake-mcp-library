import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerSearchSentryIssues(server: McpServer) {
  server.registerTool(
    'search_sentry_issues',
    {
      description:
        "Search the tenant's connected Sentry organization for issues (GET /v1/integrations/sentry/search). Requires the Sentry integration to be configured. Pass each hit's id to add_sentry_related_resource to link it to an incident.",
      inputSchema: z.object({
        query: z.string().optional().describe('Optional Sentry search query (free text matches the issue message)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchSentryIssues(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Sentry: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
