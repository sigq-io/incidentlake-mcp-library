import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';
import type { JsonObject } from '../types';

type Input = {
  incidentId: string;
  includeDrills?: boolean;
  issueId: string;
  name?: string;
};

export function registerAddSentryRelatedResource(server: McpServer) {
  server.registerTool(
    'add_sentry_related_resource',
    {
      description:
        "Link a Sentry issue (from search_sentry_issues) to an incident as a related resource. The click-through URL is built server-side from the tenant's Sentry integration settings. If this issue was already linked, the existing link is returned.",
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        issueId: z
          .string()
          .regex(/^\d{1,20}$/, 'issueId must be a numeric Sentry issue id')
          .describe('Sentry issue id (numeric)'),
        name: z.string().optional().describe('Issue title, used as the resource title'),
      }),
    },
    async (input: Input) => {
      try {
        const body: JsonObject = { issueId: input.issueId };
        if (input.name !== undefined) body.name = input.name;
        const data = await api.addIncidentRelatedResourceBySentryIssue(input.incidentId, body, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error linking Sentry issue: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}
