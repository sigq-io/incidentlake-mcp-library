import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerCreateIncidentTaskJiraIssue(server: McpServer) {
  server.registerTool(
    'create_incident_task_jira_issue',
    {
      description:
        'Create a Jira issue from an incident task and link them. Copies title/description and sets assignee, due date, and status when possible. Requires the Jira integration to be configured.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        taskId: z.string().uuid().describe('The UUID of the task'),
        projectKey: z.string().min(1).describe('Jira project key (e.g. OPS)'),
        issueType: z
          .string()
          .min(1)
          .optional()
          .describe('Optional Jira issue type name (defaults to the project default)'),
      }),
    },
    async (input) => {
      try {
        const body: { projectKey: string; issueType?: string } = {
          projectKey: input.projectKey,
        };
        if (input.issueType !== undefined) body.issueType = input.issueType;
        const data = await api.createIncidentTaskJiraIssue(input.incidentId, input.taskId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating Jira issue from incident task: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
