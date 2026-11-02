import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerListDrillSessions(server: McpServer) {
  server.registerTool(
    'list_drill_sessions',
    {
      description:
        'List drill sessions. Participants who are not controllers get no cards and no scenarioId until the drill ends.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listDrillSessions();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing drill sessions: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
