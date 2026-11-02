import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGetCmdbGraphPendingChanges(server: McpServer) {
  server.registerTool(
    'get_cmdb_graph_pending_changes',
    {
      description:
        'Diff the live CMDB graph against the last published version. Pure read — records nothing. ' +
        '`hasChanges` is false when the live graph matches the latest published version.',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.getCmdbGraphPendingChanges();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting CMDB graph pending changes: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
