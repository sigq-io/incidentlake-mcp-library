import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

type Input = {
  incidentId: string;
  includeDrills?: boolean;
  taskId: string;
  projectKey: string;
  issueType?: string;
};

export function registerCreateIncidentTaskJiraIssue(server: McpServer) {
  server.registerTool(
    'create_incident_task_jira_issue',
    {
      description:
        "Create a new Jira issue from an incident task and link them. The task's title and content become the Jira summary and description. Use link_incident_task_external_issue to attach a pre-existing issue instead.",
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        taskId: z.string().uuid().describe('The UUID of the task'),
        projectKey: z.string().min(1).describe('Jira project key, e.g. KAN'),
        issueType: z
          .string()
          .optional()
          .describe("Jira issue type name (defaults to the project's default type)"),
      }),
    },
    async (input: Input) => {
      try {
        const body: JsonObject = { projectKey: input.projectKey };
        if (input.issueType !== undefined) body.issueType = input.issueType;
        const data = await api.createIncidentTaskJiraIssue(input.incidentId, input.taskId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating Jira issue: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
