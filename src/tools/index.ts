import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListIncidents } from './listIncidents';
import { registerGetIncident } from './getIncident';
import { registerSearchIncidents } from './searchIncidents';
import { registerGetAnalytics } from './getAnalytics';
import { registerCreateIncident } from './createIncident';
import { registerGetSopCompletions } from './getSopCompletions';
import { registerAddIncidentNote } from './addIncidentNote';

export function registerTools(server: McpServer) {
  registerListIncidents(server);
  registerGetIncident(server);
  registerSearchIncidents(server);
  registerGetAnalytics(server);
  registerCreateIncident(server);
  registerGetSopCompletions(server);
  registerAddIncidentNote(server);
}
