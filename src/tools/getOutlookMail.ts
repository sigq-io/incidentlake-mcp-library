import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGetOutlookMail(server: McpServer) {
  server.registerTool(
    'get_outlook_mail',
    {
      description:
        "Fetch one email (including the full plain-text body) from the tenant's Outlook service mailbox by id. Use search_outlook_mail to find ids.",
      inputSchema: z.object({
        id: z.string().uuid().describe('The UUID of the ingested email'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getOutlookMail(input.id);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error fetching Outlook mail: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
