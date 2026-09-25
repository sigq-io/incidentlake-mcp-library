import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteSlackThread(server: McpServer) {
  server.registerTool(
    'delete_slack_thread',
    {
      description:
        'Unlink a Slack thread from an incident. Use the thread id from slackThreadUrls on get_incident (or from add_slack_thread). Threads linked automatically by the Slack bot cannot be removed with this tool.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        threadId: z
          .string()
          .uuid()
          .describe('The linked thread UUID (id from slackThreadUrls on get_incident)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteSlackThread(input.incidentId, input.threadId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error deleting Slack thread: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
