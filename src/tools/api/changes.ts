import { z } from 'zod';
import type { ApiToolDefinition } from './defineApiTool';

const changeId = z.string().uuid().describe('Change record UUID');
const releaseId = z.string().uuid().describe('Release UUID');
const dateTime = (what: string) => z.string().nullable().optional().describe(`${what} (ISO 8601); null clears it`);
const serviceIds = z.array(z.string().uuid()).optional().describe('Affected service UUIDs');
const changeType = z.enum(['standard', 'normal', 'emergency']);
const riskLevel = z.enum(['low', 'medium', 'high']);
const changeStatus = z.enum(['requested', 'approved', 'rejected', 'implemented', 'cancelled']);
const page = {
  limit: z.number().int().min(1).max(200).optional().describe('Page size (default 50, max 200)'),
  offset: z.number().int().min(0).optional().describe('Offset for pagination'),
};
const stringList = (what: string, max = 30) =>
  z.array(z.string().min(1).max(100)).max(max).optional().describe(what);

const changeFields = {
  description: z.string().max(20000).nullable().optional().describe('Description (manual changes only)'),
  url: z.string().url().nullable().optional().describe('http(s) link to the change (manual changes only)'),
  changeType: changeType.optional().describe('standard = pre-approved, normal = needs approval, emergency = expedited'),
  riskLevel: riskLevel.optional(),
  status: changeStatus.optional().describe('Manual changes only'),
  serviceIds,
  plannedStartAt: dateTime('Planned start'),
  plannedEndAt: dateTime('Planned end, not before the start'),
  implementedAt: dateTime('When it was implemented (manual changes only); defaults to now when status becomes implemented'),
};

const releaseInput = {
  name: z.string().min(1).max(500).describe('Release name'),
  tagName: z.string().max(255).optional().describe('Version tag'),
  description: z.string().max(20000).optional(),
  status: z.enum(['planned', 'published', 'deployed', 'cancelled']).optional().describe('Default planned'),
  plannedAt: z.string().optional().describe('Planned release time (ISO 8601)'),
  serviceIds,
  changeIds: z.array(z.string().uuid()).optional().describe('Change record UUIDs included in the release'),
};

export const changeTools: ApiToolDefinition[] = [
  // Changes
  {
    name: 'list_changes',
    description:
      'List change records (GitHub pull requests and manual changes), newest first, with the total count.',
    method: 'GET',
    path: '/v1/changes',
    input: {
      status: changeStatus.optional(),
      changeType: changeType.optional(),
      serviceId: z.string().uuid().optional().describe('Only changes affecting this service'),
      search: z.string().max(200).optional().describe('Title text, or the PR number (e.g. "#123")'),
      from: z.string().optional().describe('Implemented/opened at or after (ISO 8601)'),
      to: z.string().optional().describe('Implemented/opened before (ISO 8601)'),
      ...page,
    },
  },
  {
    name: 'create_change',
    description: 'Record a manual change (one that does not come from a GitHub pull request).',
    method: 'POST',
    path: '/v1/changes',
    input: { title: z.string().min(1).max(500).describe('Change title'), ...changeFields },
  },
  {
    name: 'get_change',
    description: 'Get a change record with the incidents it is linked to that the caller can read.',
    method: 'GET',
    path: '/v1/changes/{changeId}',
    input: { changeId },
  },
  {
    name: 'update_change',
    description:
      'Update a change record. Only the fields given are changed. For GitHub changes only the type, risk, services and planned window can be changed, which overrides their automatic classification.',
    method: 'PATCH',
    path: '/v1/changes/{changeId}',
    input: {
      changeId,
      title: z.string().min(1).max(500).optional().describe('Change title (manual changes only)'),
      ...changeFields,
    },
  },
  {
    name: 'delete_change',
    description: 'Delete a manual change record. GitHub changes cannot be deleted.',
    method: 'DELETE',
    path: '/v1/changes/{changeId}',
    input: { changeId },
  },

  // Releases
  {
    name: 'list_releases',
    description: 'List releases (GitHub releases and manual releases).',
    method: 'GET',
    path: '/v1/releases',
    input: page,
  },
  {
    name: 'create_release',
    description:
      'Create a manual release bundling change records. Status deployed marks its changes as deployed to production.',
    method: 'POST',
    path: '/v1/releases',
    input: releaseInput,
  },
  {
    name: 'get_release',
    description: 'Get a release with the changes it includes.',
    method: 'GET',
    path: '/v1/releases/{releaseId}',
    input: { releaseId },
  },
  {
    name: 'update_release',
    description:
      'Replace a manual release: send the whole release, as for create. Fields left out are cleared, and changeIds replaces the included changes.',
    method: 'PATCH',
    path: '/v1/releases/{releaseId}',
    input: { releaseId, ...releaseInput },
  },
  {
    name: 'delete_release',
    description: 'Delete a manual release. GitHub releases cannot be deleted.',
    method: 'DELETE',
    path: '/v1/releases/{releaseId}',
    input: { releaseId },
  },

  // Deployments
  {
    name: 'list_deployments',
    description:
      'List deployments, newest first, with their environment, whether it is production, status, release and changes.',
    method: 'GET',
    path: '/v1/deployments',
    input: {
      environment: z.string().max(100).optional().describe('Only this environment (exact match)'),
      ...page,
    },
  },
  {
    name: 'create_deployment',
    description:
      "Record a manual deployment (one that does not go through GitHub Deployments). With a releaseId, the release's changes are attached; a successful production deployment marks the release deployed.",
    method: 'POST',
    path: '/v1/deployments',
    input: {
      environment: z.string().min(1).max(100).describe('Environment name, e.g. "production"'),
      status: z
        .enum(['pending', 'in_progress', 'success', 'failure', 'error', 'inactive'])
        .optional()
        .describe('Default success'),
      releaseId: releaseId.optional().describe('Release that was deployed'),
      ref: z.string().max(255).optional().describe('Git ref or version deployed'),
      description: z.string().max(5000).optional(),
      deployedAt: z.string().optional().describe('Deployment time (ISO 8601, default now)'),
    },
  },

  // Settings and GitHub sync
  {
    name: 'get_change_settings',
    description:
      'Get change management settings: GitHub sync (repositories, branches, label filters and classification labels), production environments, default services and the last sync result.',
    method: 'GET',
    path: '/v1/change-settings',
  },
  {
    name: 'update_change_settings',
    description:
      'Update change management settings. Only the fields given are changed; a list replaces the current one. Changing the branch or label filters re-reads recent pull requests on the next sync.',
    method: 'PUT',
    path: '/v1/change-settings',
    input: {
      githubSyncEnabled: z.boolean().optional().describe('Sync pull requests, releases and deployments from GitHub'),
      githubRepos: stringList('Repositories to sync, as owner/name or GitHub URLs (max 10)', 10),
      baseBranches: stringList('Only pull requests into these branches (empty = all)'),
      includeLabels: stringList('Only pull requests with one of these labels (empty = all)'),
      excludeLabels: stringList('Skip pull requests with any of these labels'),
      emergencyLabels: stringList('Labels that classify a change as emergency'),
      standardLabels: stringList('Labels that classify a change as standard (pre-approved)'),
      productionEnvironments: z
        .array(z.string().min(1).max(100))
        .min(1)
        .max(30)
        .optional()
        .describe('Deployment environments that count as production (at least one)'),
      defaultServiceIds: z.array(z.string().uuid()).max(30).optional().describe('Services assigned to synced changes by default'),
    },
  },
  {
    name: 'sync_changes_from_github',
    description: 'Sync changes, releases and deployments from GitHub now and return the result. Fails when a sync is already running.',
    method: 'POST',
    path: '/v1/change-settings/sync',
    timeoutMs: 120_000,
  },
  {
    name: 'list_change_github_repositories',
    description: 'List the GitHub repositories the connected GitHub token can read. Fails with 409 when GitHub is not connected.',
    method: 'GET',
    path: '/v1/change-settings/github-repositories',
  },
];
