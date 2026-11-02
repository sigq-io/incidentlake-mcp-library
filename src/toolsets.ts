/**
 * Groups of Public API tools that can be switched on and off. The original tool set (incidents,
 * notes, tags, SOP, members, knowledge, CMDB services, risks, integrations, drills, ...) is always
 * registered; these groups add the rest of the Public API on top of it.
 */
export const TOOLSETS = {
  incident_response:
    'Incident follow-through: AI-filled field provenance and autofill, severity detection, checklist templates and suggestions, commanders, task reports and approvals, role assignments, ITIL fields and closure, linked changes, risks, RBAC tags and NetBox hardware',
  incident_chat: 'Incident emergency chat rooms: open, close, invite, join, read and post messages',
  task_board: 'Task board projects, tasks, scopes (milestones), comments and the work overview',
  improvement: 'Improvement tasks, risk history, risk links, problem candidates and corrective actions',
  knowledge: 'Knowledge base semantic search, versions, CSV import, classification and review settings',
  changes: 'Change management: changes, releases, deployments and GitHub sync',
  specs: 'Specifications: spaces, pages, drafts and reviews, threads, versions, change requests, sources and AI judgements',
  emergency: 'Emergency (BCP) response plans, contacts, activations and AI consultations',
  evidence: 'Evidence library documents, pages and search',
  business_continuity: 'Business operations, BCP scenarios, service links and locations',
  cmdb: 'CMDB extras: service incident counts, tags, ITIL attributes, dependency extraction, NetBox devices and the service catalog',
  workflow: 'Workflow automation rules and their runs',
  admin:
    'Tenant configuration: checklist templates, action item templates, incident roles and routing, severity criteria, RBAC rules, ITIL settings, task pings and checkpoints',
} as const;

export type Toolset = keyof typeof TOOLSETS;

export const DEFAULT_TOOLSETS: readonly Toolset[] = ['incident_response', 'incident_chat', 'task_board'];

const ALL_TOOLSETS = Object.keys(TOOLSETS) as Toolset[];

function isToolset(value: string): value is Toolset {
  return Object.prototype.hasOwnProperty.call(TOOLSETS, value);
}

/**
 * Parses a comma-separated toolset list such as `default,specs` or `all`. `default` expands to
 * DEFAULT_TOOLSETS, `all` to every toolset and `none` to no extra toolset. Unknown names are
 * ignored. An empty or missing value means the defaults.
 */
export function parseToolsets(value: string | null | undefined): Set<Toolset> {
  const names = (value ?? '')
    .split(/[\s,]+/)
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0) return new Set(DEFAULT_TOOLSETS);

  const selected = new Set<Toolset>();
  for (const name of names) {
    if (name === 'all') ALL_TOOLSETS.forEach((t) => selected.add(t));
    else if (name === 'default') DEFAULT_TOOLSETS.forEach((t) => selected.add(t));
    else if (isToolset(name)) selected.add(name);
  }
  return selected;
}
