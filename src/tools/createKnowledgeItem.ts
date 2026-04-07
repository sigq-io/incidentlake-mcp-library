import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { optionalNonEmptyStringArraySchema } from '../coerceArrays';
import type { JsonObject } from '../types';

export function registerCreateKnowledgeItem(server: McpServer) {
  server.registerTool(
    'create_knowledge_item',
    {
      description: 'Create a knowledge item (POST /v1/knowledge). Requires title and content.',
      inputSchema: z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        tags: optionalNonEmptyStringArraySchema,
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {
          title: input.title,
          content: input.content,
        };
        if (input.tags?.length) body.tags = input.tags;

        const data = await api.createKnowledgeItem(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error creating knowledge item: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
