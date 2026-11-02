import { z } from 'zod';
import type { ApiToolDefinition } from './defineApiTool';

const uuid = (what: string) => z.string().uuid().describe(`${what} UUID`);
const projectId = uuid('Task board project');
const taskId = uuid('Task board task');
const scopeId = uuid('Task board scope');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #6366f1');
const status = z.enum(['todo', 'in_progress', 'review', 'done']);
const priority = z.enum(['urgent', 'high', 'medium', 'low']);
const scopeStatus = z.enum(['planned', 'active', 'done']);

const taskFields = {
  description: z.string().max(10000).optional().describe('Task description'),
  status: status.optional().describe('Column (default todo)'),
  priority: priority.optional().describe('Default medium'),
  assigneeId: z.string().uuid().nullable().optional().describe('Tenant member UUID; null to unassign'),
  scopeId: z.string().uuid().nullable().optional().describe('Scope (milestone) UUID; null for none'),
  incidentIds: z.array(z.string().uuid()).max(20).optional().describe('Linked incident UUIDs (max 20)'),
  startDate: day.nullable().optional().describe('Start day (YYYY-MM-DD)'),
  dueDate: day.nullable().optional().describe('Due day (YYYY-MM-DD); a day before startDate is moved to startDate'),
  points: z.number().min(0).max(1000).optional().describe('Estimate, one decimal place (default 0)'),
  dependsOn: z.array(z.string().uuid()).max(50).optional().describe('UUIDs of tasks this one waits for (max 50, no cycles)'),
};

const scopeFields = {
  goal: z.string().max(2000).optional().describe('What the scope should achieve'),
  color: color.optional().describe('Hex color (default #6366f1)'),
  status: scopeStatus.optional().describe('Default planned'),
  outOfScope: z.array(z.string().min(1).max(500)).max(50).optional().describe('Items explicitly out of scope (max 50)'),
};

const projectFields = {
  description: z.string().max(2000).optional().describe('Project description'),
  color: color.optional().describe('Hex color (default #6366f1)'),
  planningEnabled: z.boolean().optional().describe('Enable scopes and the timeline (default false)'),
};

const importRow = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: status.optional(),
  priority: priority.optional(),
  assigneeId: z.string().uuid().optional(),
  startDate: day.optional(),
  dueDate: day.optional(),
  externalKey: z.string().max(200).optional().describe('Key in the source tracker; rows whose key the project already has are skipped'),
  externalUrl: z.string().url().optional(),
  comments: z
    .array(
      z.object({
        author: z.string().max(200).optional(),
        body: z.string().min(1).max(10000),
        createdAt: z.string().optional().describe('ISO 8601 timestamp'),
      }),
    )
    .max(100)
    .optional(),
});

export const taskBoardTools: ApiToolDefinition[] = [
  // Projects and overviews
  {
    name: 'list_task_board_projects',
    description: 'List task board projects.',
    method: 'GET',
    path: '/v1/task-board',
  },
  {
    name: 'get_task_board_overview',
    description:
      "Work overview across task board projects, incident tasks and improvement tasks. Defaults to the token owner's work; scope=all shows everyone's.",
    method: 'GET',
    path: '/v1/task-board/overview',
    input: { scope: z.enum(['all']).optional().describe("all: everyone's work") },
  },
  {
    name: 'list_incident_follow_up_tasks',
    description: 'List the task board tasks that follow up an incident.',
    method: 'GET',
    path: '/v1/task-board/incidents/{incidentId}/tasks',
    input: { incidentId: uuid('Incident') },
  },
  {
    name: 'list_problem_follow_up_tasks',
    description: 'List the task board tasks that follow up a problem (corrective actions).',
    method: 'GET',
    path: '/v1/task-board/problems/{riskId}/tasks',
    input: { riskId: uuid('Problem (risk)') },
  },
  {
    name: 'adopt_improvement_suggestion',
    description:
      'Turn an AI-suggested improvement task (see list_improvement_tasks) into a task board task. Omitted fields come from the suggestion, which leaves the inbox as adopted. Needs improvement tasks write.',
    method: 'POST',
    destructive: true,
    path: '/v1/task-board/suggestions/{improvementTaskId}/adopt',
    input: {
      improvementTaskId: uuid('Improvement task'),
      projectId: projectId.describe('Project to add the task to'),
      assigneeId: z.string().uuid().nullable().optional().describe('Tenant member UUID'),
      dueDate: day.nullable().optional().describe('Due day (YYYY-MM-DD)'),
      priority: priority.optional(),
    },
  },
  {
    name: 'create_task_board_project',
    description: 'Create a task board project (at most 200 per tenant).',
    method: 'POST',
    path: '/v1/task-board/projects',
    input: { name: z.string().min(1).max(100).describe('Project name'), ...projectFields },
  },
  {
    name: 'get_task_board_project',
    description: "Get a project's board with its tasks and scopes.",
    method: 'GET',
    path: '/v1/task-board/projects/{projectId}',
    input: { projectId },
  },
  {
    name: 'update_task_board_project',
    description: 'Update a task board project. Only the fields given are changed.',
    method: 'PATCH',
    path: '/v1/task-board/projects/{projectId}',
    input: {
      projectId,
      name: z.string().min(1).max(100).optional().describe('Project name'),
      ...projectFields,
      wipLimits: z
        .record(status, z.number().int().min(0).max(999).nullable())
        .optional()
        .describe('WIP limit per status, e.g. {"in_progress": 3}; null or 0 removes a limit'),
    },
  },
  {
    name: 'delete_task_board_project',
    description: 'Delete a task board project with its tasks and their files.',
    method: 'DELETE',
    path: '/v1/task-board/projects/{projectId}',
    input: { projectId },
  },
  {
    name: 'auto_schedule_task_board_project',
    description:
      'Shift unfinished tasks of a project so none starts before the tasks it depends on are due, keeping each duration. Returns the board and how many tasks were rescheduled.',
    method: 'POST',
    destructive: true,
    path: '/v1/task-board/projects/{projectId}/auto-schedule',
    input: { projectId },
  },
  {
    name: 'import_task_board_tasks',
    description:
      'Import tasks into a project, e.g. from a CSV export or another tracker (max 500 rows). Long text is cut and unreadable dates are dropped; rows whose externalKey the project already has are skipped. Needs task board manage.',
    method: 'POST',
    path: '/v1/task-board/projects/{projectId}/import',
    input: { projectId, rows: z.array(importRow).min(1).max(500).describe('Tasks to import') },
  },

  // Tasks
  {
    name: 'create_task_board_task',
    description: 'Create a task in a task board project.',
    method: 'POST',
    path: '/v1/task-board/projects/{projectId}/tasks',
    input: {
      projectId,
      title: z.string().min(1).max(500).describe('Task title'),
      ...taskFields,
      riskId: z.string().uuid().optional().describe('Problem UUID this task is a corrective action for (set on creation only)'),
    },
  },
  {
    name: 'update_task_board_task',
    description:
      'Update a task board task. Only the fields given are changed; projectId moves it to another project, which drops its scope and dependencies.',
    method: 'PATCH',
    path: '/v1/task-board/tasks/{taskId}',
    input: {
      taskId,
      title: z.string().min(1).max(500).optional().describe('Task title'),
      ...taskFields,
      projectId: projectId.optional().describe('Move the task to this project'),
    },
  },
  {
    name: 'delete_task_board_task',
    description: 'Delete a task board task.',
    method: 'DELETE',
    path: '/v1/task-board/tasks/{taskId}',
    input: { taskId },
  },
  {
    name: 'move_task_board_task',
    description: 'Move a task on the board to a column and position.',
    method: 'POST',
    destructive: true,
    path: '/v1/task-board/tasks/{taskId}/move',
    retries: 2,
    input: {
      taskId,
      status: status.describe('Target column'),
      index: z.number().int().min(0).describe('Position within the column, 0 for the top'),
    },
  },

  // Comments and attachments
  {
    name: 'get_task_board_task_details',
    description: "Get a task's comments and files.",
    method: 'GET',
    path: '/v1/task-board/tasks/{taskId}/details',
    input: { taskId },
  },
  {
    name: 'add_task_board_comment',
    description: 'Comment on a task board task. To attach files, use upload_task_board_attachments.',
    method: 'POST',
    path: '/v1/task-board/tasks/{taskId}/comments',
    input: { taskId, body: z.string().min(1).max(10000).describe('Comment text') },
  },
  {
    name: 'delete_task_board_comment',
    description: 'Delete a task board comment (its author, or task board manage).',
    method: 'DELETE',
    path: '/v1/task-board/comments/{commentId}',
    input: { commentId: uuid('Task board comment') },
  },
  {
    name: 'upload_task_board_attachments',
    description: 'Attach local files to a task board task (up to five per call, 25 MB each, 20 per task).',
    method: 'POST',
    path: '/v1/task-board/tasks/{taskId}/attachments',
    timeoutMs: 120_000,
    upload: { field: 'files', multiple: true },
    input: { taskId },
  },
  {
    name: 'download_task_board_attachment',
    description: 'Download a task board file to a local directory.',
    method: 'GET',
    path: '/v1/task-board/attachments/{attachmentId}',
    download: { fallbackName: 'attachment' },
    input: { attachmentId: uuid('Task board attachment') },
  },
  {
    name: 'delete_task_board_attachment',
    description: 'Delete a task board file (its uploader, or task board manage).',
    method: 'DELETE',
    path: '/v1/task-board/attachments/{attachmentId}',
    input: { attachmentId: uuid('Task board attachment') },
  },

  // Scopes
  {
    name: 'create_task_board_scope',
    description: 'Create a scope (milestone) in a task board project.',
    method: 'POST',
    path: '/v1/task-board/projects/{projectId}/scopes',
    input: {
      projectId,
      name: z.string().min(1).max(255).describe('Scope name'),
      targetDate: day.describe('Target day (YYYY-MM-DD)'),
      ...scopeFields,
    },
  },
  {
    name: 'update_task_board_scope',
    description: 'Update a task board scope. Only the fields given are changed.',
    method: 'PATCH',
    path: '/v1/task-board/scopes/{scopeId}',
    input: {
      scopeId,
      name: z.string().min(1).max(255).optional().describe('Scope name'),
      targetDate: day.optional().describe('Target day (YYYY-MM-DD)'),
      ...scopeFields,
    },
  },
  {
    name: 'delete_task_board_scope',
    description: 'Delete a task board scope; its tasks stay without a scope.',
    method: 'DELETE',
    path: '/v1/task-board/scopes/{scopeId}',
    input: { scopeId },
  },
  {
    name: 'lock_task_board_scope_baseline',
    description:
      "Lock a scope's current tasks and points as its baseline, replacing any earlier baseline and clearing its scope-creep log. From then on, tasks added, removed or re-estimated are logged as scope creep.",
    method: 'POST',
    destructive: true,
    path: '/v1/task-board/scopes/{scopeId}/baseline',
    input: { scopeId },
  },
  {
    name: 'clear_task_board_scope_baseline',
    description: "Clear a scope's baseline.",
    method: 'DELETE',
    path: '/v1/task-board/scopes/{scopeId}/baseline',
    input: { scopeId },
  },
];
