import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerSearchJiraIssues(server: McpServer) {
  server.registerTool(
    'search_jira_issues',
    {
      description:
        "Search the tenant's connected Jira site for issues (GET /v1/integrations/jira/issues). Requires the Jira integration to be configured. Use the returned url with add_related_resource_by_url. An exact issue key (for example KAN-1) looks up that issue directly.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe('Optional free-text filter, or an exact issue key such as KAN-1'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchJiraIssues(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Jira issues: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
