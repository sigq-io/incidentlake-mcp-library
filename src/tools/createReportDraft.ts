import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCreateReportDraft(server: McpServer) {
  server.registerTool(
    'create_report_draft',
    {
      description:
        'Create a report draft for an incident. Used to save AI-generated or manual summaries, timelines, or postmortems before publishing.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        draftType: z
          .enum(['summary', 'timeline', 'postmortem'])
          .describe('Section type of the report draft'),
        content: z.string().min(1).describe('Draft content text'),
        title: z.string().optional().describe('Optional draft title'),
        dataHash: z.string().optional().describe('Optional hash for change detection'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {
          draftType: input.draftType,
          content: input.content,
        };
        if (input.title !== undefined) body.title = input.title;
        if (input.dataHash !== undefined) body.dataHash = input.dataHash;

        const data = await api.createReportDraft(input.incidentId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating report draft: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
