import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerUnlinkIncidentTaskExternalIssue(server: McpServer) {
  server.registerTool(
    'unlink_incident_task_external_issue',
    {
      description:
        'Unlink an incident task from its Jira or Backlog issue. The task keeps its current field values and stops syncing.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        taskId: z.string().uuid().describe('The UUID of the linked task'),
      }),
    },
    async (input) => {
      try {
        const data = await api.unlinkIncidentTaskExternalIssue(input.incidentId, input.taskId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error unlinking incident task from external issue: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
