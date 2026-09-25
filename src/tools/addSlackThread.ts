import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerAddSlackThread(server: McpServer) {
  server.registerTool(
    'add_slack_thread',
    {
      description:
        "Link a Slack thread to an incident's Communication tab by URL and ingest its messages. If the Slack bot cannot read the channel, the link is still created and accessWarning explains why (e.g. not_in_channel). Linking a thread that is already linked returns a 409 error. When linking many threads, call this sequentially rather than in parallel. Linked threads appear in slackThreadUrls on get_incident.",
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        url: z
          .string()
          .url()
          .describe(
            'Slack thread URL, e.g. https://{workspace}.slack.com/archives/{channelId}/p{ts}',
          ),
      }),
    },
    async (input) => {
      try {
        const data = await api.addSlackThread(input.incidentId, input.url);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error adding Slack thread: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
