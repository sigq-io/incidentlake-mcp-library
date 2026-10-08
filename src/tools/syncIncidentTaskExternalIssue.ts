import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerSyncIncidentTaskExternalIssue(server: McpServer) {
  server.registerTool(
    'sync_incident_task_external_issue',
    {
      description:
        'Sync an incident task from its linked Jira or Backlog issue now (status, title, due date, description, assignee), instead of waiting for the periodic sweep.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        taskId: z.string().uuid().describe('The UUID of the linked task'),
      }),
    },
    async (input) => {
      try {
        const data = await api.syncIncidentTaskExternalIssue(input.incidentId, input.taskId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error syncing incident task from external issue: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
