import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerSearchGitHubIssues(server: McpServer) {
  server.registerTool(
    'search_github_issues',
    {
      description:
        "Search issues and pull requests in the tenant's connected GitHub repository (GET /v1/integrations/github/issues). Requires the GitHub integration to be configured. Pass an optional free-text query, or an issue or pull request number such as 123 or #123. Use the returned htmlUrl with add_related_resource_by_url.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe('Optional free-text filter, or an issue or pull request number such as 123 or #123'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchGitHubIssues(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching GitHub issues: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
