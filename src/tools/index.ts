import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListIncidents } from './listIncidents';
import { registerGetIncident } from './getIncident';
import { registerSearchIncidents } from './searchIncidents';
import { registerGetAnalytics } from './getAnalytics';
import { registerCreateIncident } from './createIncident';
import { registerGetSopCompletions } from './getSopCompletions';
import { registerAddIncidentNote } from './addIncidentNote';
import { registerUpdateIncident } from './updateIncident';
import { registerResolveIncident } from './resolveIncident';
import { registerReopenIncident } from './reopenIncident';
import { registerDeleteIncident } from './deleteIncident';
import { registerGetIncidentTags } from './getIncidentTags';
import { registerAddIncidentTags } from './addIncidentTags';
import { registerReplaceIncidentTags } from './replaceIncidentTags';
import { registerRemoveIncidentTags } from './removeIncidentTags';
import { registerListMembers } from './listMembers';
import { registerListKnowledgeItems } from './listKnowledgeItems';
import { registerSearchKnowledgeItems } from './searchKnowledgeItems';
import { registerListKnowledgeTags } from './listKnowledgeTags';
import { registerGetKnowledgeItem } from './getKnowledgeItem';
import { registerCreateKnowledgeItem } from './createKnowledgeItem';
import { registerUpdateKnowledgeItem } from './updateKnowledgeItem';
import { registerDeleteKnowledgeItem } from './deleteKnowledgeItem';
import { registerUpdateKnowledgeItemTags } from './updateKnowledgeItemTags';
// Severities
import { registerListIncidentSeverities } from './listIncidentSeverities';
import { registerCreateIncidentSeverity } from './createIncidentSeverity';
import { registerUpdateIncidentSeverity } from './updateIncidentSeverity';
import { registerPublishIncidentSeverity } from './publishIncidentSeverity';
// Notes
import { registerListIncidentNotes } from './listIncidentNotes';
import { registerUpdateIncidentNote } from './updateIncidentNote';
import { registerDeleteIncidentNote } from './deleteIncidentNote';
// Tasks
import { registerListIncidentTasks } from './listIncidentTasks';
import { registerCreateIncidentTask } from './createIncidentTask';
import { registerUpdateIncidentTask } from './updateIncidentTask';
import { registerDeleteIncidentTask } from './deleteIncidentTask';
// SOP
import { registerCompleteSopStep } from './completeSopStep';
import { registerUncompleteSopStep } from './uncompleteSopStep';
// Commanders
import { registerGetIncidentCommanders } from './getIncidentCommanders';
import { registerGetCommanderHistory } from './getCommanderHistory';
// Services
import { registerGetIncidentServices } from './getIncidentServices';
import { registerUpdateIncidentServices } from './updateIncidentServices';
// Related resources
import { registerListRelatedResources } from './listRelatedResources';
import { registerAddRelatedResources } from './addRelatedResources';
import { registerDeleteRelatedResource } from './deleteRelatedResource';
// Reports
import { registerListReportDrafts } from './listReportDrafts';
import { registerCreateReportDraft } from './createReportDraft';
import { registerListPublishedReports } from './listPublishedReports';
// Scheduled workflows
import { registerListScheduledWorkflows } from './listScheduledWorkflows';
import { registerCreateScheduledWorkflow } from './createScheduledWorkflow';
import { registerCancelScheduledWorkflow } from './cancelScheduledWorkflow';
// Members (individual)
import { registerGetMember } from './getMember';
import { registerUpdateMember } from './updateMember';
import { registerRemoveMember } from './removeMember';

export function registerTools(server: McpServer) {
  // Incidents
  registerListIncidents(server);
  registerGetIncident(server);
  registerSearchIncidents(server);
  registerGetAnalytics(server);
  registerCreateIncident(server);
  registerUpdateIncident(server);
  registerResolveIncident(server);
  registerReopenIncident(server);
  registerDeleteIncident(server);
  // SOP
  registerGetSopCompletions(server);
  registerCompleteSopStep(server);
  registerUncompleteSopStep(server);
  // Notes
  registerAddIncidentNote(server);
  registerListIncidentNotes(server);
  registerUpdateIncidentNote(server);
  registerDeleteIncidentNote(server);
  // Tags
  registerGetIncidentTags(server);
  registerAddIncidentTags(server);
  registerReplaceIncidentTags(server);
  registerRemoveIncidentTags(server);
  // Severities
  registerListIncidentSeverities(server);
  registerCreateIncidentSeverity(server);
  registerUpdateIncidentSeverity(server);
  registerPublishIncidentSeverity(server);
  // Tasks
  registerListIncidentTasks(server);
  registerCreateIncidentTask(server);
  registerUpdateIncidentTask(server);
  registerDeleteIncidentTask(server);
  // Commanders
  registerGetIncidentCommanders(server);
  registerGetCommanderHistory(server);
  // Services
  registerGetIncidentServices(server);
  registerUpdateIncidentServices(server);
  // Related resources
  registerListRelatedResources(server);
  registerAddRelatedResources(server);
  registerDeleteRelatedResource(server);
  // Reports
  registerListReportDrafts(server);
  registerCreateReportDraft(server);
  registerListPublishedReports(server);
  // Scheduled workflows
  registerListScheduledWorkflows(server);
  registerCreateScheduledWorkflow(server);
  registerCancelScheduledWorkflow(server);
  // Members
  registerListMembers(server);
  registerGetMember(server);
  registerUpdateMember(server);
  registerRemoveMember(server);
  // Knowledge
  registerListKnowledgeItems(server);
  registerSearchKnowledgeItems(server);
  registerListKnowledgeTags(server);
  registerGetKnowledgeItem(server);
  registerCreateKnowledgeItem(server);
  registerUpdateKnowledgeItem(server);
  registerDeleteKnowledgeItem(server);
  registerUpdateKnowledgeItemTags(server);
}
