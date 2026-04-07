import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerUpdateKnowledgeItem(server: McpServer) {
  server.registerTool(
    'update_knowledge_item',
    {
      description:
        'Partially update a knowledge item (PATCH /v1/knowledge/{knowledgeId}). Provide at least one of title, content, isActive.',
      inputSchema: z.object({
        knowledgeId: z.string().uuid(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      }),
    },
    async (input) => {
      try {
        const body: Record<string, unknown> = {};
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
