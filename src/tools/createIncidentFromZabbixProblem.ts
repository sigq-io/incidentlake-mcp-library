import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { optionalNonEmptyStringArraySchema } from '../coerceArrays';
import type { JsonObject, IncidentDetail } from '../types';

const inputSchema = z.object({
  eventId: z.string().min(1).describe("Zabbix problem's eventid (from search_zabbix_problems)"),
  triggerId: z
    .string()
    .min(1)
    .describe("Zabbix problem's objectid / trigger id (from search_zabbix_problems)"),
  name: z.string().min(1).max(255).describe('Incident name (e.g. the Zabbix problem name)'),
  summary: z.string().max(5000).optional().describe('Optional initial summary of the incident'),
  severity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe(
      'Incident Lake severity where 1=critical/highest and 5=lowest — NOT Zabbix severity ' +
        '(Zabbix uses 0-5 where 5=Disaster/highest). If mapping from a search_zabbix_problems ' +
        'result, invert it (e.g. Zabbix 5/Disaster -> 1, Zabbix 4/High -> 2) rather than passing through.',
    ),
  tags: optionalNonEmptyStringArraySchema.describe(
    'Categorization tags (e.g. client:acme, urgency:high); array or comma-separated string.',
  ),
});

export function registerCreateIncidentFromZabbixProblem(server: McpServer) {
  server.registerTool(
    'create_incident_from_zabbix_problem',
    {
      description:
        'Create a new incident and link a Zabbix problem to it in one step. Convenience wrapper around create_incident + add_zabbix_related_resource — use this when a user wants to turn a Zabbix alert (from search_zabbix_problems) directly into a tracked incident.',
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
        const linkBody: JsonObject = {
          eventId: input.eventId,
          triggerId: input.triggerId,
          name: input.name,
        };
        const relatedResource = await api.addZabbixRelatedResource(incident.id, linkBody);
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
                `Incident ${incident.id} was created, but linking the Zabbix problem failed: ${errorMessage}. ` +
                `Retry with add_zabbix_related_resource using incidentId=${incident.id}, eventId=${input.eventId}, triggerId=${input.triggerId}.`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
