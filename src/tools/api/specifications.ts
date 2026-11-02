import { z } from 'zod';
import { requiredNonEmptyStringArraySchema } from '../../coerceArrays';
import type { ApiToolDefinition } from './defineApiTool';
import { AI_TIMEOUT_MS } from './defineApiTool';

const UPLOAD_TIMEOUT_MS = 120_000;
const TITLE_MAX = 255;
const CONTENT_MAX = 200_000;
const NOTE_MAX = 5_000;

const spaceId = z.string().uuid().describe('Specification space UUID');
const nodeId = z.string().uuid().describe('Page or category UUID');
const pageId = z.string().uuid().describe('Specification page UUID');
const revisionId = z.string().uuid().describe('Page revision UUID');
const tagId = z.string().uuid().describe('Version (tag) UUID');
const changeRequestId = z.string().uuid().describe('Specification change request UUID');
const sourceId = z.string().uuid().describe('Specification source UUID');
const threadId = z.string().uuid().describe('Discussion thread UUID');
const incidentId = z.string().uuid().describe('Incident UUID');
const language = z.enum(['ja', 'en']).optional().describe('Language of the AI output (default ja)');
const uuidList = (what: string) => z.array(z.string().uuid()).describe(what);

const spaceFields = {
  description: z.string().max(NOTE_MAX).nullable().optional().describe('Description; null clears'),
  serviceIds: uuidList('CMDB service UUIDs the space covers (replaces the list)').optional(),
  ownerMemberIds: uuidList(
    'Tenant member UUIDs who confirm Drafts (replaces the list; only owners or admins may change it)',
  ).optional(),
  changeSyncEnabled: z
    .boolean()
    .optional()
    .describe('Draft page updates automatically from change records of the linked services (default true)'),
  reviewReminderDays: z
    .number()
    .int()
    .min(0)
    .max(90)
    .optional()
    .describe('Remind owners about Drafts unconfirmed for this many days; 0 turns reminders off (default 3)'),
};

const proposals = z
  .array(
    z.object({
      id: z.string().uuid().optional().describe('Existing proposal UUID, to keep it when editing'),
      pageId: z.string().uuid().nullable().optional().describe('Page to change; omit or null for a new page'),
      parentId: z.string().uuid().nullable().optional().describe('Parent category of a new page'),
      baseRevisionId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Revision the proposal is based on (default: the latest)'),
      title: z.string().min(1).max(TITLE_MAX).describe('Page title'),
      content: z.string().max(CONTENT_MAX).describe('Proposed page content (Markdown)'),
    }),
  )
  .max(20)
  .describe('Page proposals (max 20)');

const snapshotRef = (what: string) =>
  z.string().min(1).describe(`${what}: a version (tag) UUID, "official" or "latest"`);

export const specificationTools: ApiToolDefinition[] = [
  // Spaces
  {
    name: 'list_spec_spaces',
    description: 'List specification spaces.',
    method: 'GET',
    path: '/v1/spec-spaces',
  },
  {
    name: 'create_spec_space',
    description: 'Create a specification space. Returns the space.',
    method: 'POST',
    path: '/v1/spec-spaces',
    input: {
      name: z.string().min(1).max(TITLE_MAX).describe('Space name'),
      ...spaceFields,
    },
  },
  {
    name: 'get_spec_space',
    description:
      'Get a specification space with its page tree (categories and pages) and whether the caller can confirm Drafts.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}',
    input: { spaceId },
  },
  {
    name: 'update_spec_space',
    description: 'Update a specification space. Only the fields sent are changed. Returns the space.',
    method: 'PATCH',
    path: '/v1/spec-spaces/{spaceId}',
    input: {
      spaceId,
      name: z.string().min(1).max(TITLE_MAX).optional().describe('Space name'),
      ...spaceFields,
    },
  },
  {
    name: 'delete_spec_space',
    description: 'Delete a specification space and everything in it. Owners and admins only.',
    method: 'DELETE',
    path: '/v1/spec-spaces/{spaceId}',
    input: { spaceId },
  },
  {
    name: 'get_spec_space_stats',
    description: 'Get incident statistics of the pages of a specification space.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/stats',
    input: { spaceId },
  },
  // Tree
  {
    name: 'create_spec_node',
    description:
      'Create a page (with its first revision, a Draft unless approve) or a category in a specification space. Returns pageId and revisionId.',
    method: 'POST',
    path: '/v1/spec-spaces/{spaceId}/nodes',
    input: {
      spaceId,
      kind: z.enum(['page', 'category']).optional().describe('What to create (default page)'),
      parentId: z.string().uuid().nullable().optional().describe('Parent category UUID; omit for the top level'),
      title: z.string().min(1).max(TITLE_MAX).describe('Title'),
      content: z.string().max(CONTENT_MAX).optional().describe('Page content (Markdown); pages only'),
      summary: z.string().max(500).optional().describe('One-line summary of the page'),
      approve: z.boolean().optional().describe('Confirm the first revision as official at once (owners and admins)'),
    },
  },
  {
    name: 'rename_spec_category',
    description: 'Rename a category of a specification space. Pages are renamed with update_spec_page.',
    method: 'PATCH',
    path: '/v1/spec-spaces/{spaceId}/nodes/{nodeId}',
    input: {
      spaceId,
      nodeId,
      title: z.string().min(1).max(TITLE_MAX).describe('New category title'),
    },
  },
  {
    name: 'delete_spec_node',
    description: 'Delete a page or a category of a specification space, with everything under it.',
    method: 'DELETE',
    path: '/v1/spec-spaces/{spaceId}/nodes/{nodeId}',
    input: { spaceId, nodeId },
  },
  {
    name: 'move_spec_node',
    description: 'Move a page or category under another category (or to the top level) at a position among its new siblings.',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-spaces/{spaceId}/nodes/{nodeId}/move',
    retries: 2,
    input: {
      spaceId,
      nodeId,
      parentId: z.string().uuid().nullable().optional().describe('New parent category UUID; null for the top level'),
      position: z.number().int().min(0).describe('Zero-based index among the new siblings'),
    },
  },
  // Drafts
  {
    name: 'list_spec_pending_drafts',
    description:
      'List the Drafts of a specification space waiting to be confirmed as the correct specification, with the official revision to compare each against.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/pending',
    input: { spaceId },
  },
  {
    name: 'approve_spec_drafts',
    description:
      'Confirm several Drafts of a space as the official specification at once (owners and admins). Returns approved and skipped revision IDs.',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-spaces/{spaceId}/pending/approve',
    retries: 2,
    input: {
      spaceId,
      revisionIds: requiredNonEmptyStringArraySchema.describe('Distinct Draft revision UUIDs (max 200)'),
    },
  },
  // Pages and revisions
  {
    name: 'get_spec_page',
    description:
      'Get a specification page: its official and latest revision, revision history, linked services and linked incidents.',
    method: 'GET',
    path: '/v1/spec-pages/{pageId}',
    input: { pageId },
  },
  {
    name: 'update_spec_page',
    description:
      'Save a new revision of a page (a Draft unless approve). Pass basedOnRevisionId, the revision you edited: a save based on an older revision than the latest is refused so newer text is not lost.',
    method: 'PUT',
    idempotent: false,
    path: '/v1/spec-pages/{pageId}',
    retries: 0,
    input: {
      pageId,
      title: z.string().min(1).max(TITLE_MAX).describe('Page title'),
      content: z.string().max(CONTENT_MAX).describe('Full page content (Markdown)'),
      summary: z.string().max(500).optional().describe('One-line summary'),
      changeNote: z.string().max(NOTE_MAX).optional().describe('What changed and why'),
      basedOnRevisionId: z.string().uuid().nullable().optional().describe('Revision the edit started from'),
      approve: z.boolean().optional().describe('Confirm the revision as official at once (owners and admins)'),
    },
  },
  {
    name: 'set_spec_page_services',
    description: 'Replace the CMDB services linked to a specification page ([] clears).',
    method: 'PUT',
    path: '/v1/spec-pages/{pageId}/services',
    input: {
      pageId,
      serviceIds: uuidList('CMDB service UUIDs'),
    },
  },
  {
    name: 'list_spec_page_revisions',
    description: 'List the revisions of a specification page with their state (draft, official, superseded, rejected).',
    method: 'GET',
    path: '/v1/spec-pages/{pageId}/revisions',
    input: { pageId },
  },
  {
    name: 'get_spec_revision',
    description: 'Get one revision of a specification page.',
    method: 'GET',
    path: '/v1/spec-revisions/{revisionId}',
    input: { revisionId },
  },
  {
    name: 'approve_spec_revision',
    description: 'Confirm a Draft revision as the correct (official) specification. Owners and admins only.',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-revisions/{revisionId}/approve',
    retries: 2,
    input: { revisionId },
  },
  {
    name: 'reject_spec_revision',
    description: 'Reject a Draft revision of a specification page.',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-revisions/{revisionId}/reject',
    input: {
      revisionId,
      reason: z
        .enum(['ai_misread', 'behavior_is_bug', 'other'])
        .describe('ai_misread = the AI misread the source, behavior_is_bug = the described behavior is a bug'),
      note: z.string().max(NOTE_MAX).optional().describe('Details'),
    },
  },
  // Versions
  {
    name: 'list_spec_versions',
    description: 'List the versions (tags: named snapshots of the official specification) of a space.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/tags',
    input: { spaceId },
  },
  {
    name: 'create_spec_version',
    description:
      'Tag the current official specification of a space as a named version. Fails with 409 when no page is official yet.',
    method: 'POST',
    path: '/v1/spec-spaces/{spaceId}/tags',
    input: {
      spaceId,
      name: z.string().min(1).max(100).describe('Version name, e.g. "v2.3"'),
      description: z.string().max(NOTE_MAX).optional().describe('Description'),
      releaseId: z.string().uuid().optional().describe('Release record UUID this version ships with'),
    },
  },
  {
    name: 'preview_spec_version',
    description: 'Preview what a new version of a space would contain and what changed since the previous version.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/tags/preview',
    input: { spaceId },
  },
  {
    name: 'get_spec_version',
    description: 'Get a version of a space: its pages and what changed against the previous version.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/tags/{tagId}',
    input: { spaceId, tagId },
  },
  {
    name: 'delete_spec_version',
    description: 'Delete a version (tag) of a specification space. Owners and admins only.',
    method: 'DELETE',
    path: '/v1/spec-spaces/{spaceId}/tags/{tagId}',
    input: { spaceId, tagId },
  },
  {
    name: 'generate_spec_release_notes',
    description:
      'Write the release notes of a version from its changes since the previous version and save them on the version. (AI; consumes credits)',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-spaces/{spaceId}/tags/{tagId}/release-notes',
    timeoutMs: AI_TIMEOUT_MS,
    input: { spaceId, tagId, language },
  },
  {
    name: 'compare_spec_snapshots',
    description: 'Compare two snapshots of a specification space page by page.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/compare',
    input: {
      spaceId,
      from: snapshotRef('Older snapshot'),
      to: snapshotRef('Newer snapshot (default latest)').optional(),
    },
  },
  // Sources
  {
    name: 'list_spec_sources',
    description:
      'List the sources of a specification space (uploaded files, evidence documents, crawled web pages) with their last run.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/sources',
    input: { spaceId },
  },
  {
    name: 'add_spec_source',
    description:
      'Add a web page or evidence library document as a source; specification Drafts are extracted from it. Runs at once unless runNow is false. Returns sourceId and runId. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/spec-spaces/{spaceId}/sources',
    input: {
      spaceId,
      kind: z.enum(['web', 'evidence_document']).describe('Source type'),
      name: z.string().max(TITLE_MAX).optional().describe('Display name (default: the URL or document title)'),
      url: z.string().url().optional().describe('Start URL (web)'),
      pathPrefix: z.string().max(500).optional().describe('Only crawl URLs under this path (web; default: the URL directory)'),
      maxPages: z.number().int().min(1).max(50).optional().describe('Pages to crawl (web; default 20)'),
      documentId: z.string().uuid().optional().describe('Evidence document UUID (evidence_document)'),
      schedule: z.enum(['manual', 'daily', 'weekly']).optional().describe('Re-read schedule (default manual)'),
      runNow: z.boolean().optional().describe('Set false to add without reading it now'),
    },
  },
  {
    name: 'upload_spec_source',
    description:
      'Upload a document (.docx, .pdf, .txt, .md, .csv, .xlsx; max 50MB) to a specification space and extract specification Drafts from it. Returns sourceId and runId. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/spec-spaces/{spaceId}/sources/upload',
    upload: { field: 'file' },
    timeoutMs: UPLOAD_TIMEOUT_MS,
    input: {
      spaceId,
      name: z.string().max(TITLE_MAX).optional().describe('Display name (default: the file name)'),
    },
  },
  {
    name: 'update_spec_source',
    description: 'Update a source: name, schedule, and for web sources url, pathPrefix and maxPages.',
    method: 'PATCH',
    path: '/v1/spec-sources/{sourceId}',
    input: {
      sourceId,
      name: z.string().min(1).max(TITLE_MAX).optional().describe('Display name'),
      schedule: z.enum(['manual', 'daily', 'weekly']).optional().describe('Re-read schedule (files: manual only)'),
      url: z.string().url().optional().describe('Start URL (web)'),
      pathPrefix: z.string().max(500).optional().describe('Only crawl URLs under this path (web)'),
      maxPages: z.number().int().min(1).max(50).optional().describe('Pages to crawl (web)'),
    },
  },
  {
    name: 'delete_spec_source',
    description: 'Delete a source of a specification space; it is no longer read or scheduled.',
    method: 'DELETE',
    path: '/v1/spec-sources/{sourceId}',
    input: { sourceId },
  },
  {
    name: 'run_spec_source',
    description: 'Read a source again now and extract Drafts from what changed. Returns the runId. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/spec-sources/{sourceId}/run',
    input: { sourceId },
  },
  {
    name: 'upload_spec_source_version',
    description:
      'Upload a new version of an uploaded source document; only what changed is read. Refused while the source is being read. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/spec-sources/{sourceId}/upload',
    upload: { field: 'file' },
    timeoutMs: UPLOAD_TIMEOUT_MS,
    input: { sourceId },
  },
  {
    name: 'list_spec_source_runs',
    description: 'Get a source and the history of its runs.',
    method: 'GET',
    path: '/v1/spec-sources/{sourceId}/runs',
    input: { sourceId },
  },
  // Search and judgements
  {
    name: 'search_specs',
    description: 'Search specification pages by keywords and meaning (up to 30 hits), optionally in one space.',
    method: 'GET',
    path: '/v1/spec-search',
    input: {
      q: z.string().min(1).max(500).describe('Keywords or question'),
      spaceId: spaceId.optional(),
    },
  },
  {
    name: 'ask_specs',
    description:
      'Ask the specifications what is specified, or whether a described behavior is a bug. Returns the verdict with its confidence and citations, and saves the judgement. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/spec-judgements',
    timeoutMs: AI_TIMEOUT_MS,
    input: {
      question: z.string().min(1).max(4_000).describe('Question or observed behavior'),
      context: z.string().max(4_000).optional().describe('Extra context (e.g. environment, steps)'),
      spaceIds: uuidList('Spaces to consult (default: all)').optional(),
      intent: z
        .enum(['auto', 'question', 'behavior'])
        .optional()
        .describe('question = what is specified, behavior = is this a bug (default auto)'),
      language,
    },
  },
  {
    name: 'list_incident_specs',
    description: 'List the specification pages linked to an incident and the spec judgements made for it.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/specs',
    input: { incidentId },
  },
  {
    name: 'judge_incident_spec',
    description:
      "Ask whether an incident's behavior is a bug or as specified. Without spaceIds, searches the spaces tied to the incident's services and their direct dependencies, plus spaces tied to no service. Saves the judgement. (AI; consumes credits)",
    method: 'POST',
    path: '/v1/incidents/{incidentId}/specs/judge',
    timeoutMs: AI_TIMEOUT_MS,
    input: {
      incidentId,
      question: z.string().max(4_000).optional().describe('Behavior to judge (default: the incident name)'),
      spaceIds: uuidList('Spaces to consult').optional(),
      language,
    },
  },
  {
    name: 'link_incident_spec',
    description: 'Link a specification page to an incident, or update the link, with how the incident relates to it.',
    method: 'PUT',
    path: '/v1/incidents/{incidentId}/specs/{pageId}',
    input: {
      incidentId,
      pageId,
      relation: z
        .enum(['as_specified', 'bug', 'spec_gap', 'spec_defect', 'related'])
        .describe('as_specified = behaved as specified, bug = differs from the spec, spec_gap = not specified, spec_defect = the spec is wrong'),
      note: z.string().max(NOTE_MAX).optional().describe('Note'),
      revisionId: z.string().uuid().nullable().optional().describe('Revision the judgement refers to'),
    },
  },
  {
    name: 'unlink_incident_spec',
    description: 'Remove the link between a specification page and an incident.',
    method: 'DELETE',
    path: '/v1/incidents/{incidentId}/specs/{pageId}',
    input: { incidentId, pageId },
  },
  {
    name: 'list_service_specs',
    description:
      'List the specification spaces that cover a CMDB service and their pages, with pages linked to the service directly first.',
    method: 'GET',
    path: '/v1/services/{serviceId}/specs',
    input: { serviceId: z.string().uuid().describe('CMDB service UUID') },
  },
  // Consistency checks
  {
    name: 'list_spec_checks',
    description: 'List the latest AI consistency checks (contradictions, gaps, ambiguities) of a specification space.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/checks',
    input: { spaceId },
  },
  {
    name: 'start_spec_check',
    description:
      'Start checking a whole specification space for contradictions, gaps and ambiguities in the background. Poll list_spec_checks for the result. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/spec-spaces/{spaceId}/checks',
    input: { spaceId, language },
  },
  // Discussion board
  {
    name: 'list_spec_threads',
    description: 'List the discussion threads of a specification space, optionally for one page.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/threads',
    input: {
      spaceId,
      status: z.enum(['open', 'resolved', 'all']).optional().describe('Thread status (default all)'),
      pageId: pageId.optional(),
    },
  },
  {
    name: 'create_spec_thread',
    description: 'Start a discussion thread in a specification space, optionally on a page and quoting its text. Returns the thread id.',
    method: 'POST',
    path: '/v1/spec-spaces/{spaceId}/threads',
    input: {
      spaceId,
      title: z.string().min(1).max(TITLE_MAX).describe('Thread title'),
      content: z.string().min(1).max(10_000).describe('First post (Markdown)'),
      pageId: pageId.optional().describe('Page the thread is about'),
      revisionId: revisionId.optional().describe('Revision of that page'),
      quote: z.string().max(2_000).optional().describe('Quoted page text'),
    },
  },
  {
    name: 'get_spec_thread',
    description: 'Get a discussion thread with its posts.',
    method: 'GET',
    path: '/v1/spec-threads/{threadId}',
    input: { threadId },
  },
  {
    name: 'update_spec_thread',
    description:
      'Rename a thread (author or admin), or resolve and reopen it (author, space owners or admins).',
    method: 'PATCH',
    path: '/v1/spec-threads/{threadId}',
    input: {
      threadId,
      title: z.string().min(1).max(TITLE_MAX).optional().describe('New title'),
      status: z.enum(['open', 'resolved']).optional().describe('New status'),
    },
  },
  {
    name: 'delete_spec_thread',
    description: 'Delete a discussion thread with its posts (author or admin).',
    method: 'DELETE',
    path: '/v1/spec-threads/{threadId}',
    input: { threadId },
  },
  {
    name: 'reply_spec_thread',
    description: 'Reply in a discussion thread. Everyone who posted in it is notified. Returns the post id.',
    method: 'POST',
    path: '/v1/spec-threads/{threadId}/posts',
    input: {
      threadId,
      content: z.string().min(1).max(10_000).describe('Reply (Markdown)'),
    },
  },
  {
    name: 'edit_spec_thread_post',
    description: 'Edit your own post in a discussion thread.',
    method: 'PATCH',
    path: '/v1/spec-threads/{threadId}/posts/{postId}',
    input: {
      threadId,
      postId: z.string().uuid().describe('Post UUID'),
      content: z.string().min(1).max(10_000).describe('New content (Markdown)'),
    },
  },
  {
    name: 'delete_spec_thread_post',
    description: 'Delete a post (author or admin). The first post cannot be deleted on its own; delete the thread instead.',
    method: 'DELETE',
    path: '/v1/spec-threads/{threadId}/posts/{postId}',
    input: {
      threadId,
      postId: z.string().uuid().describe('Post UUID'),
    },
  },
  // Change requests
  {
    name: 'list_spec_change_requests',
    description: 'List the change requests of a specification space.',
    method: 'GET',
    path: '/v1/spec-spaces/{spaceId}/change-requests',
    input: {
      spaceId,
      status: z.enum(['open', 'merged', 'rejected', 'closed']).optional().describe('Only this status'),
    },
  },
  {
    name: 'create_spec_change_request',
    description:
      'Open a change request with page proposals for review before they become the official specification. Returns its id and number.',
    method: 'POST',
    path: '/v1/spec-spaces/{spaceId}/change-requests',
    input: {
      spaceId,
      title: z.string().min(1).max(TITLE_MAX).describe('Change request title'),
      description: z.string().max(CONTENT_MAX).optional().describe('Description (Markdown)'),
      pages: proposals.optional(),
      originType: z.enum(['manual', 'incident', 'chat']).optional().describe('What prompted it (default manual)'),
      originId: z.string().uuid().optional().describe('Incident or chat UUID when originType is not manual'),
    },
  },
  {
    name: 'get_spec_change_request',
    description: 'Get a change request with its proposals, discussion, impact estimate and conflicts with the current specification.',
    method: 'GET',
    path: '/v1/spec-change-requests/{changeRequestId}',
    input: { changeRequestId },
  },
  {
    name: 'update_spec_change_request',
    description:
      "Update an open change request's title, description or proposals. pages replaces the whole proposal list; keep proposal ids to keep them.",
    method: 'PATCH',
    path: '/v1/spec-change-requests/{changeRequestId}',
    input: {
      changeRequestId,
      title: z.string().min(1).max(TITLE_MAX).optional().describe('Title'),
      description: z.string().max(CONTENT_MAX).nullable().optional().describe('Description; null clears'),
      pages: proposals.optional(),
    },
  },
  {
    name: 'set_spec_change_request_status',
    description: 'Reject, withdraw (closed) or reopen a change request.',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-change-requests/{changeRequestId}/status',
    retries: 2,
    input: {
      changeRequestId,
      status: z.enum(['rejected', 'closed', 'open']).describe('New status'),
    },
  },
  {
    name: 'merge_spec_change_request',
    description:
      'Merge a change request into the official specification (owners and admins). With createChange, also opens a change record for it. Returns the result and changeId.',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-change-requests/{changeRequestId}/apply',
    input: {
      changeRequestId,
      createChange: z.boolean().optional().describe('Also create a change record (needs the changes feature)'),
    },
  },
  {
    name: 'rebase_spec_proposal',
    description: "Rebase a change request proposal onto the page's current official revision after the page changed.",
    method: 'POST',
    destructive: true,
    path: '/v1/spec-change-requests/{changeRequestId}/proposals/{proposalId}/rebase',
    input: {
      changeRequestId,
      proposalId: z.string().uuid().describe('Proposal UUID from get_spec_change_request'),
    },
  },
  {
    name: 'estimate_spec_change_impact',
    description:
      'Estimate the difficulty and impact of a change request and save the estimate on it. (AI; consumes credits)',
    method: 'POST',
    destructive: true,
    path: '/v1/spec-change-requests/{changeRequestId}/impact',
    timeoutMs: AI_TIMEOUT_MS,
    input: { changeRequestId, language },
  },
  {
    name: 'summarize_spec_change_discussion',
    description:
      'Summarize the discussion of a change request and post the summary as an AI comment. Returns the comment id. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/spec-change-requests/{changeRequestId}/discussion-summary',
    timeoutMs: AI_TIMEOUT_MS,
    input: { changeRequestId, language },
  },
  {
    name: 'link_spec_change_request_change',
    description: 'Link a change record to a specification change request.',
    method: 'PUT',
    path: '/v1/spec-change-requests/{changeRequestId}/change',
    input: {
      changeRequestId,
      changeId: z.string().uuid().describe('Change record UUID'),
    },
  },
  {
    name: 'add_spec_change_request_comment',
    description: 'Comment on a change request, optionally on one proposal, quoting text or replying to a comment. Returns the comment id.',
    method: 'POST',
    path: '/v1/spec-change-requests/{changeRequestId}/comments',
    input: {
      changeRequestId,
      content: z.string().min(1).max(10_000).describe('Comment (Markdown)'),
      quote: z.string().max(2_000).optional().describe('Quoted text the comment is about'),
      proposalId: z.string().uuid().optional().describe('Proposal the comment is on'),
      parentCommentId: z.string().uuid().optional().describe('Comment being replied to'),
    },
  },
  {
    name: 'delete_spec_change_request_comment',
    description: 'Delete a comment from a change request (its author or an admin).',
    method: 'DELETE',
    path: '/v1/spec-change-requests/{changeRequestId}/comments/{commentId}',
    input: {
      changeRequestId,
      commentId: z.string().uuid().describe('Comment UUID'),
    },
  }
];
