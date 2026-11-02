import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerGetCmdbGraphVersionDetail(server: McpServer) {
  server.registerTool(
    'get_cmdb_graph_version_detail',
    {
      description:
        'Get one CMDB graph version with its full snapshot and diff. Versions are immutable — there ' +
        'is deliberately no update or delete counterpart.',
      inputSchema: z.object({
        versionNumber: z.number().int().positive().describe('The version number to fetch'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getCmdbGraphVersionDetail(input.versionNumber);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error getting CMDB graph version: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
