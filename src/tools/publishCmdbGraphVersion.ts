import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerPublishCmdbGraphVersion(server: McpServer) {
  server.registerTool(
    'publish_cmdb_graph_version',
    {
      description:
        'Publish the live CMDB graph as a new named version — snapshots whatever is currently live. ' +
        'Fails when the live graph is identical to the latest published version.',
      inputSchema: z.object({
        name: z
          .string()
          .max(255)
          .optional()
          .describe('Optional label. Omitted or blank falls back to "Version N" at display time.'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.name !== undefined) body.name = input.name;
        const data = await api.publishCmdbGraphVersion(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error publishing CMDB graph version: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
