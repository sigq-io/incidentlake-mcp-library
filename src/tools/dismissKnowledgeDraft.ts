import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerDismissKnowledgeDraft(server: McpServer) {
  server.registerTool(
    'dismiss_knowledge_draft',
    {
      description:
        'Dismiss a pending AI knowledge draft (POST /v1/knowledge/{knowledgeId}/dismiss). Removes it from the review queue as an inactive knowledge item. It is not embedded and is not permanently deleted.',
      inputSchema: z.object({
        knowledgeId: z.string().uuid().describe('UUID of a pending AI knowledge draft'),
      }),
    },
    async (input) => {
      try {
        const data = await api.dismissKnowledgeDraft(input.knowledgeId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error dismissing knowledge draft: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
