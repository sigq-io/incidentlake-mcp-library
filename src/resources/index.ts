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

  // Template resource: notes for a specific incident
  server.registerResource(
    'incident-notes',
    new ResourceTemplate('sigq://incidents/{id}/notes', { list: undefined }),
    { description: 'All notes for a specific incident (newest first)', mimeType: 'application/json' },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      try {
        const rawId = variables['id'];
        const incidentId = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!incidentId || !uuidSchema.safeParse(incidentId).success) {
          throw new Error(`Invalid incident id: "${incidentId}"`);
        }
        const data = await api.listIncidentNotes(incidentId);
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
              text: JSON.stringify({ error: `Failed to fetch incident notes: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Template resource: tasks for a specific incident
  server.registerResource(
    'incident-tasks',
    new ResourceTemplate('sigq://incidents/{id}/tasks', { list: undefined }),
    { description: 'All tasks for a specific incident with their reports and reviews', mimeType: 'application/json' },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      try {
        const rawId = variables['id'];
        const incidentId = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!incidentId || !uuidSchema.safeParse(incidentId).success) {
          throw new Error(`Invalid incident id: "${incidentId}"`);
        }
        const data = await api.listIncidentTasks(incidentId);
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
              text: JSON.stringify({ error: `Failed to fetch incident tasks: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Template resource: severity history for a specific incident
  server.registerResource(
    'incident-severities',
    new ResourceTemplate('sigq://incidents/{id}/severities', { list: undefined }),
    {
      description: 'Severity history for a specific incident (latestDraft, latestPublished, and all rows)',
      mimeType: 'application/json',
    },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      try {
        const rawId = variables['id'];
        const incidentId = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!incidentId || !uuidSchema.safeParse(incidentId).success) {
          throw new Error(`Invalid incident id: "${incidentId}"`);
        }
        const data = await api.listIncidentSeverities(incidentId);
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
              text: JSON.stringify({ error: `Failed to fetch incident severities: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Template resource: active commanders for a specific incident
  server.registerResource(
    'incident-commanders',
    new ResourceTemplate('sigq://incidents/{id}/commanders', { list: undefined }),
    { description: 'Active incident commanders (assignees) for a specific incident', mimeType: 'application/json' },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      try {
        const rawId = variables['id'];
        const incidentId = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!incidentId || !uuidSchema.safeParse(incidentId).success) {
          throw new Error(`Invalid incident id: "${incidentId}"`);
        }
        const data = await api.getIncidentCommanders(incidentId);
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
              text: JSON.stringify({ error: `Failed to fetch incident commanders: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Static resource: all active tenant members
  server.registerResource(
    'members',
    'sigq://members',
    {
      description: 'All active tenant members — useful for resolving emails before assigning incidents or tasks',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const data = await api.listMembers();
        return {
          contents: [
            { uri: 'sigq://members', mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          contents: [
            {
              uri: 'sigq://members',
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Failed to fetch members: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Static resource: all knowledge items
  server.registerResource(
    'knowledge',
    'sigq://knowledge',
    {
      description: 'All knowledge base articles for the tenant, ordered by most recently updated',
      mimeType: 'application/json',
    },
    async () => {
      try {
        const data = await api.listKnowledgeItems();
        return {
          contents: [
            { uri: 'sigq://knowledge', mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          contents: [
            {
              uri: 'sigq://knowledge',
              mimeType: 'application/json',
              text: JSON.stringify({ error: `Failed to fetch knowledge items: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );

  // Template resource: a single knowledge item by UUID
  server.registerResource(
    'knowledge-item',
    new ResourceTemplate('sigq://knowledge/{id}', { list: undefined }),
    { description: 'Full details of a single knowledge base article by UUID', mimeType: 'application/json' },
    async (uri: URL, variables: Record<string, string | string[]>) => {
      try {
        const rawId = variables['id'];
        const knowledgeId = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!knowledgeId || !uuidSchema.safeParse(knowledgeId).success) {
          throw new Error(`Invalid knowledge id: "${knowledgeId}"`);
        }
        const data = await api.getKnowledgeItem(knowledgeId);
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
              text: JSON.stringify({ error: `Failed to fetch knowledge item: ${errorMessage}` }, null, 2),
            },
          ],
        };
      }
    },
  );
}
