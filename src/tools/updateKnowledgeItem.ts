import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerUpdateKnowledgeItem(server: McpServer) {
  server.registerTool(
    'update_knowledge_item',
    {
      description:
        'Partially update a knowledge item (PATCH /v1/knowledge/{knowledgeId}). Provide at least one of title, content, isActive.',
      inputSchema: z.object({
        knowledgeId: z.string().uuid().describe('UUID of the knowledge item to update.'),
        title: z.string().min(1).optional().describe('New title for the knowledge item.'),
        content: z.string().min(1).optional().describe('New content/body for the knowledge item.'),
        isActive: z
          .boolean()
          .optional()
          .describe('Whether the knowledge item should be active and available for use.'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.title !== undefined) body.title = input.title;
        if (input.content !== undefined) body.content = input.content;
        if (input.isActive !== undefined) body.isActive = input.isActive;

        if (Object.keys(body).length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: provide at least one of title, content, isActive.',
              },
            ],
            isError: true,
          };
        }

        const data = await api.updateKnowledgeItem(input.knowledgeId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error updating knowledge item: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
