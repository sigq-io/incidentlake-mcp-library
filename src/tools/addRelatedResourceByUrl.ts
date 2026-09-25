import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

type AddRelatedResourceByUrlInput = {
  incidentId: string;
  url: string;
};

export function registerAddRelatedResourceByUrl(server: McpServer) {
  server.registerTool(
    'add_related_resource_by_url',
    {
      description:
        'Link a Jira, Notion, Datadog, or Google Drive URL to an incident (POST /v1/incidents/{id}/related-resources/url). Typically used with a url from search_jira_issues or search_notion_pages. If the URL is already linked, the existing link is returned.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        url: z
          .string()
          .min(1)
          .describe('Jira, Notion, Datadog, or Google Drive URL to link'),
      }) as z.ZodType<AddRelatedResourceByUrlInput>,
    },
    async (input: AddRelatedResourceByUrlInput) => {
      try {
        const data = await api.addRelatedResourceByUrl(input.incidentId, input.url);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error linking related resource by URL: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
