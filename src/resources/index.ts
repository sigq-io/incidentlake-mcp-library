import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

const uuidSchema = z.string().uuid();

export function registerResources(server: McpServer) {
  // Static resource: 20 most recently created incidents
  server.registerResource(
    'recent-incidents',
    'sigq://incidents/recent',
    {
      description: 'The 20 most recently created incidents for quick situational awareness',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const params = new URLSearchParams({ limit: '20', sortBy: 'createdAt', sortDir: 'desc' });
        const data = await api.listIncidents(params);
        return {
          contents: [
            {
              uri: 'sigq://incidents/recent',
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          contents: [
            {
              uri: 'sigq://incidents/recent',
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Failed to fetch recent incidents: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Static resource: all ongoing incidents
  server.registerResource(
    'ongoing-incidents',
    'sigq://incidents/ongoing',
    {
      description: 'All currently active/ongoing incidents requiring attention',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const params = new URLSearchParams({ status: 'ongoing', limit: '100' });
        const data = await api.listIncidents(params);
        return {
          contents: [
            {
              uri: 'sigq://incidents/ongoing',
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          contents: [
            {
              uri: 'sigq://incidents/ongoing',
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Failed to fetch ongoing incidents: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Template resource: full details for a specific incident by UUID
  server.registerResource(
    'incident-detail',
    new ResourceTemplate('sigq://incidents/{id}', { list: undefined }),
    { description: 'Full details for a specific incident by UUID', mimeType: 'application/json' },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      try {
        const rawId = variables['id'];
        const incidentId = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!incidentId) {
          throw new Error('Missing incident id in resource URI');
        }
        if (!uuidSchema.safeParse(incidentId).success) {
          throw new Error(`Invalid incident id: "${incidentId}" is not a valid UUID`);
        }
        const data = await api.getIncident(incidentId);
        return {
          contents: [
            { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Failed to fetch incident: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );
}
