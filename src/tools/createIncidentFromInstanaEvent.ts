import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { optionalNonEmptyStringArraySchema } from '../coerceArrays';
import type { JsonObject, IncidentDetail } from '../types';

const inputSchema = z.object({
  eventId: z.string().min(1).describe("Instana event's eventId (from search_instana_events)"),
  name: z.string().min(1).max(255).describe('Incident name (e.g. the Instana event name)'),
  summary: z.string().max(5000).optional().describe('Optional initial summary of the incident'),
  severity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe(
      'Incident Lake severity where 1=critical/highest and 5=lowest — NOT Instana severity ' +
        '(Instana uses -1/absent=Change, 5=Warning, 10=Critical). If mapping from a ' +
        'search_instana_events result, invert it (e.g. Instana 10/Critical -> 1, Instana ' +
        '5/Warning -> 3) rather than passing through.',
    ),
  tags: optionalNonEmptyStringArraySchema.describe(
    'Categorization tags (e.g. client:acme, urgency:high); array or comma-separated string.',
  ),
});

export function registerCreateIncidentFromInstanaEvent(server: McpServer) {
  server.registerTool(
    'create_incident_from_instana_event',
    {
      description:
        'Create a new incident and link an Instana event to it in one step. Convenience wrapper around create_incident + add_instana_related_resource — use this when a user wants to turn an Instana event (from search_instana_events) directly into a tracked incident.',
      inputSchema: z.object(inputSchema.shape),
    },
    async (input) => {
      const incidentBody: JsonObject = { name: input.name };
      if (input.summary) incidentBody.summary = input.summary;
      if (input.severity) incidentBody.severity = input.severity;
      if (input.tags?.length) incidentBody.tags = input.tags;

      let incident: IncidentDetail;
      try {
        incident = await api.createIncident(incidentBody);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating incident: ${errorMessage}` }],
          isError: true,
        };
      }

      try {
        const linkBody: JsonObject = { eventId: input.eventId, name: input.name };
        const relatedResource = await api.addInstanaRelatedResource(incident.id, linkBody);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ incident, relatedResource }, null, 2) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text:
                `Incident ${incident.id} was created, but linking the Instana event failed: ${errorMessage}. ` +
                `Retry with add_instana_related_resource using incidentId=${incident.id}, eventId=${input.eventId}.`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
