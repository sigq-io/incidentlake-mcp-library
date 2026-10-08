import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerLinkIncidentTaskExternalIssue(server: McpServer) {
  server.registerTool(
    'link_incident_task_external_issue',
    {
      description:
        'Link an incident task to an existing Jira or Backlog issue by URL or issue key. Mirrors status, title, due date, description, and assignee from the issue onto the task. Linking an already-done issue requires admin authority on the API token owner.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        taskId: z.string().uuid().describe('The UUID of the task to link'),
        source: z.enum(['jira', 'backlog']).describe('External tracker'),
        reference: z
          .string()
          .min(1)
          .describe('Issue key (e.g. OPS-12) or full issue URL on the connected site'),
      }),
    },
    async (input) => {
      try {
        const data = await api.linkIncidentTaskExternalIssue(input.incidentId, input.taskId, {
          source: input.source,
          reference: input.reference,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error linking incident task to external issue: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
