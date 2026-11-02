import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

type Input = {
  query: string;
  hoursBack?: number;
  limit?: number;
};

export function registerSearchOutlookMail(server: McpServer) {
  server.registerTool(
    'search_outlook_mail',
    {
      description:
        "Keyword search (subject, body, sender) over emails Incident Lake has synced from the tenant's Outlook service mailbox, newest first. Only bodyPreview (first 300 chars) is returned — use get_outlook_mail for the full body. Requires the Outlook add-on and a configured, enabled mailbox.",
      inputSchema: z.object({
        query: z.string().min(1).describe('Keyword to match against subject, body or sender'),
        hoursBack: z.number().int().positive().optional().describe('Only include mail received within this many hours'),
        limit: z.number().int().min(1).max(50).optional().describe('Max results (default 10, max 50)'),
      }),
    },
    async (input: Input) => {
      try {
        const data = await api.searchOutlookMail(input.query, input.hoursBack, input.limit);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Outlook mail: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
