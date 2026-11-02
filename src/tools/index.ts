import { McpServer } from "@modelcontextprotocol/server";
import { registerGetCurrentTenant } from './getCurrentTenant';
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
import { registerListPendingKnowledgeDrafts } from './listPendingKnowledgeDrafts';
import { registerApproveKnowledgeDraft } from './approveKnowledgeDraft';
import { registerDismissKnowledgeDraft } from './dismissKnowledgeDraft';
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
// Task external-issue linking
import { registerLinkIncidentTaskExternalIssue } from './linkIncidentTaskExternalIssue';
import { registerCreateIncidentTaskJiraIssue } from './createIncidentTaskJiraIssue';
import { registerSyncIncidentTaskExternalIssue } from './syncIncidentTaskExternalIssue';
import { registerUnlinkIncidentTaskExternalIssue } from './unlinkIncidentTaskExternalIssue';
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
import { registerAddRelatedResourceByUrl } from './addRelatedResourceByUrl';
import { registerAddGrafanaRelatedResource } from './addGrafanaRelatedResource';
import { registerAddSentryRelatedResource } from './addSentryRelatedResource';
import { registerAddRollbarRelatedResource } from './addRollbarRelatedResource';
import { registerAddSlackThread } from './addSlackThread';
import { registerDeleteSlackThread } from './deleteSlackThread';
// Meeting bots
import { registerListIncidentMeetingBots } from './listIncidentMeetingBots';
import { registerCreateIncidentMeetingBot } from './createIncidentMeetingBot';
import { registerDeleteIncidentMeetingBot } from './deleteIncidentMeetingBot';
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
// Bulk incidents
import { registerBulkDeleteIncidents } from './bulkDeleteIncidents';
import { registerExportIncidents } from './exportIncidents';
// Blast radius
import { registerGetIncidentBlastRadius } from './getIncidentBlastRadius';
// Services (CMDB)
import { registerListServices } from './listServices';
import { registerGetService } from './getService';
import { registerCreateService } from './createService';
import { registerUpdateService } from './updateService';
import { registerDeleteService } from './deleteService';
import { registerUpdateServiceHealth } from './updateServiceHealth';
// Service dependencies (CMDB graph edges)
import { registerListServiceDependencies } from './listServiceDependencies';
import { registerListServiceReverseDependencies } from './listServiceReverseDependencies';
import { registerListServiceDependencyEdges } from './listServiceDependencyEdges';
import { registerUpsertServiceDependency } from './upsertServiceDependency';
import { registerDeleteServiceDependency } from './deleteServiceDependency';
// CMDB graph batch apply + version history
import { registerSaveCmdbGraphBatch } from './saveCmdbGraphBatch';
import { registerGetCmdbGraphPendingChanges } from './getCmdbGraphPendingChanges';
import { registerPublishCmdbGraphVersion } from './publishCmdbGraphVersion';
import { registerListCmdbGraphVersions } from './listCmdbGraphVersions';
import { registerGetCmdbGraphVersionDetail } from './getCmdbGraphVersionDetail';
// Risks
import { registerListRisks } from './listRisks';
import { registerGetRisk } from './getRisk';
import { registerCreateRisk } from './createRisk';
import { registerUpdateRisk } from './updateRisk';
import { registerLinkRiskToIncident } from './linkRiskToIncident';
// Integrations
import { registerListIntegrations } from './listIntegrations';
import { registerSearchJiraIssues } from './searchJiraIssues';
import { registerSearchGitHubIssues } from './searchGitHubIssues';
import { registerVerifyIntegrationConnection } from './verifyIntegrationConnection';
import { registerSearchNotionPages } from './searchNotionPages';
import { registerSearchGrafanaResources } from './searchGrafanaResources';
import { registerSearchSentryIssues } from './searchSentryIssues';
import { registerSearchRollbarItems } from './searchRollbarItems';
import { registerSearchOutlookMail } from './searchOutlookMail';
import { registerGetOutlookMail } from './getOutlookMail';
// Zabbix
import { registerSearchZabbixProblems } from './searchZabbixProblems';
import { registerAddZabbixRelatedResource } from './addZabbixRelatedResource';
import { registerCreateIncidentFromZabbixProblem } from './createIncidentFromZabbixProblem';
// Instana
import { registerSearchInstanaEvents } from './searchInstanaEvents';
import { registerAddInstanaRelatedResource } from './addInstanaRelatedResource';
import { registerCreateIncidentFromInstanaEvent } from './createIncidentFromInstanaEvent';
// RBAC tags
import { registerListRbacTags } from './listRbacTags';
// Response Timeline
import { registerGetIncidentPhaseGraph } from './getIncidentPhaseGraph';
import { registerCreateIncidentPhaseNode } from './createIncidentPhaseNode';
import { registerUpdateIncidentPhaseNode } from './updateIncidentPhaseNode';
import { registerDeleteIncidentPhaseNode } from './deleteIncidentPhaseNode';
import { registerCreateIncidentPhaseEdge } from './createIncidentPhaseEdge';
import { registerDeleteIncidentPhaseEdge } from './deleteIncidentPhaseEdge';
import { registerListIncidentPhaseCaptures } from './listIncidentPhaseCaptures';
import { registerCreateIncidentPhaseCapture } from './createIncidentPhaseCapture';
import { registerDeleteIncidentPhaseCapture } from './deleteIncidentPhaseCapture';
import { registerGetIncidentPhaseTelemetry } from './getIncidentPhaseTelemetry';
// Drills
import { registerListDrillIndustries } from './listDrillIndustries';
import { registerListDrillCatalog } from './listDrillCatalog';
import { registerListDrillScenarios } from './listDrillScenarios';
import { registerCreateDrillScenario } from './createDrillScenario';
import { registerCreateDrillScenarioFromCatalog } from './createDrillScenarioFromCatalog';
import { registerGetDrillScenario } from './getDrillScenario';
import { registerUpdateDrillScenario } from './updateDrillScenario';
import { registerDeleteDrillScenario } from './deleteDrillScenario';
import { registerListDrillSessions } from './listDrillSessions';
import { registerCreateDrillSession } from './createDrillSession';
import { registerGetDrillSession } from './getDrillSession';
import { registerUpdateDrillSession } from './updateDrillSession';
import { registerStartDrillSession } from './startDrillSession';
import { registerPauseDrillSession } from './pauseDrillSession';
import { registerResumeDrillSession } from './resumeDrillSession';
import { registerCompleteDrillSession } from './completeDrillSession';
import { registerListDrillDecisions } from './listDrillDecisions';
import { registerCreateDrillDecision } from './createDrillDecision';
import { registerDeliverDrillInject } from './deliverDrillInject';
import { registerInjectDrillWildcard } from './injectDrillWildcard';
import { registerGenerateDrillDebrief } from './generateDrillDebrief';
import { registerGetDrillDebrief } from './getDrillDebrief';
import { registerAcceptDrillImprovement } from './acceptDrillImprovement';
import { registerDismissDrillImprovement } from './dismissDrillImprovement';
import { registerApiTools } from './api/index';
import { DEFAULT_TOOLSETS, type Toolset } from '../toolsets';

export interface RegisterToolsOptions {
  /**
   * Register tools that read or write the local filesystem (export_incidents, file uploads and
   * downloads). Must be false when the server runs remotely, where "local" would be the server's
   * disk, not the user's.
   */
  localFileAccess?: boolean;
  /** Optional Public API tool groups on top of the always-on tools. Defaults to DEFAULT_TOOLSETS. */
  toolsets?: ReadonlySet<Toolset>;
}

export function registerTools(
  server: McpServer,
  { localFileAccess = true, toolsets = new Set(DEFAULT_TOOLSETS) }: RegisterToolsOptions = {},
) {
  registerGetCurrentTenant(server);
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
  // Task external-issue linking
  registerLinkIncidentTaskExternalIssue(server);
  registerCreateIncidentTaskJiraIssue(server);
  registerSyncIncidentTaskExternalIssue(server);
  registerUnlinkIncidentTaskExternalIssue(server);
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
  registerAddRelatedResourceByUrl(server);
  registerAddGrafanaRelatedResource(server);
  registerAddSentryRelatedResource(server);
  registerAddRollbarRelatedResource(server);
  registerAddSlackThread(server);
  registerDeleteSlackThread(server);
  // Meeting bots
  registerListIncidentMeetingBots(server);
  registerCreateIncidentMeetingBot(server);
  registerDeleteIncidentMeetingBot(server);
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
  // Bulk incidents
  registerBulkDeleteIncidents(server);
  if (localFileAccess) {
    registerExportIncidents(server);
  }
  // Blast radius
  registerGetIncidentBlastRadius(server);
  // Services (CMDB)
  registerListServices(server);
  registerGetService(server);
  registerCreateService(server);
  registerUpdateService(server);
  registerDeleteService(server);
  registerUpdateServiceHealth(server);
  // Service dependencies (CMDB graph edges)
  registerListServiceDependencies(server);
  registerListServiceReverseDependencies(server);
  registerListServiceDependencyEdges(server);
  registerUpsertServiceDependency(server);
  registerDeleteServiceDependency(server);
  // CMDB graph batch apply + version history
  registerSaveCmdbGraphBatch(server);
  registerGetCmdbGraphPendingChanges(server);
  registerPublishCmdbGraphVersion(server);
  registerListCmdbGraphVersions(server);
  registerGetCmdbGraphVersionDetail(server);
  // Risks
  registerListRisks(server);
  registerGetRisk(server);
  registerCreateRisk(server);
  registerUpdateRisk(server);
  registerLinkRiskToIncident(server);
  // Integrations
  registerListIntegrations(server);
  registerSearchJiraIssues(server);
  registerSearchGitHubIssues(server);
  registerVerifyIntegrationConnection(server);
  registerSearchNotionPages(server);
  registerSearchGrafanaResources(server);
  registerSearchSentryIssues(server);
  registerSearchRollbarItems(server);
  registerSearchOutlookMail(server);
  registerGetOutlookMail(server);
  // Zabbix
  registerSearchZabbixProblems(server);
  registerAddZabbixRelatedResource(server);
  registerCreateIncidentFromZabbixProblem(server);
  // Instana
  registerSearchInstanaEvents(server);
  registerAddInstanaRelatedResource(server);
  registerCreateIncidentFromInstanaEvent(server);
  // RBAC tags
  registerListRbacTags(server);
  // Response Timeline
  registerGetIncidentPhaseGraph(server);
  registerCreateIncidentPhaseNode(server);
  registerUpdateIncidentPhaseNode(server);
  registerDeleteIncidentPhaseNode(server);
  registerCreateIncidentPhaseEdge(server);
  registerDeleteIncidentPhaseEdge(server);
  registerListIncidentPhaseCaptures(server);
  registerCreateIncidentPhaseCapture(server);
  registerDeleteIncidentPhaseCapture(server);
  registerGetIncidentPhaseTelemetry(server);
  // Drills
  registerListDrillIndustries(server);
  registerListDrillCatalog(server);
  registerListDrillScenarios(server);
  registerCreateDrillScenario(server);
  registerCreateDrillScenarioFromCatalog(server);
  registerGetDrillScenario(server);
  registerUpdateDrillScenario(server);
  registerDeleteDrillScenario(server);
  registerListDrillSessions(server);
  registerCreateDrillSession(server);
  registerGetDrillSession(server);
  registerUpdateDrillSession(server);
  registerStartDrillSession(server);
  registerPauseDrillSession(server);
  registerResumeDrillSession(server);
  registerCompleteDrillSession(server);
  registerListDrillDecisions(server);
  registerCreateDrillDecision(server);
  registerDeliverDrillInject(server);
  registerInjectDrillWildcard(server);
  registerGenerateDrillDebrief(server);
  registerGetDrillDebrief(server);
  registerAcceptDrillImprovement(server);
  registerDismissDrillImprovement(server);
  // Knowledge
  registerListKnowledgeItems(server);
  registerSearchKnowledgeItems(server);
  registerListKnowledgeTags(server);
  registerGetKnowledgeItem(server);
  registerCreateKnowledgeItem(server);
  registerUpdateKnowledgeItem(server);
  registerDeleteKnowledgeItem(server);
  registerUpdateKnowledgeItemTags(server);
  registerListPendingKnowledgeDrafts(server);
  registerApproveKnowledgeDraft(server);
  registerDismissKnowledgeDraft(server);
  // Public API tool groups (see toolsets.ts)
  registerApiTools(server, toolsets, { localFileAccess });
}
