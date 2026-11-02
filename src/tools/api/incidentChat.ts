import { z } from 'zod';
import { optionalNonEmptyStringArraySchema, requiredNonEmptyStringArraySchema } from '../../coerceArrays';
import type { ApiToolDefinition } from './defineApiTool';

const incidentId = z.string().uuid().describe('Incident UUID');

export const incidentChatTools: ApiToolDefinition[] = [
  {
    name: 'get_incident_chat_room',
    description:
      "Get an incident's emergency chat room: whether it is open, who opened or closed it, and its members.",
    method: 'GET',
    path: '/v1/incidents/{incidentId}/chat-room',
    input: { incidentId },
  },
  {
    name: 'open_incident_chat_room',
    description:
      'Open the emergency chat room of an incident, or reopen it when it was closed. Optionally invite members; invited members are notified.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/chat-room',
    input: {
      incidentId,
      reason: z.string().optional().describe('Why the room is being opened (shown in the room)'),
      memberIds: optionalNonEmptyStringArraySchema.describe('Tenant member UUIDs to invite'),
    },
  },
  {
    name: 'close_incident_chat_room',
    description: 'Close the emergency chat room of an incident. Messages stay readable.',
    method: 'POST',
    destructive: true,
    path: '/v1/incidents/{incidentId}/chat-room/close',
    input: { incidentId },
  },
  {
    name: 'invite_incident_chat_members',
    description: 'Invite members to an open incident chat room. Invited members are notified.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/chat-room/members',
    input: {
      incidentId,
      memberIds: requiredNonEmptyStringArraySchema.describe('Tenant member UUIDs to invite'),
    },
  },
  {
    name: 'join_incident_chat_room',
    description:
      'Join an open incident chat room as the caller without an invitation. Read access to the incident is enough.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/chat-room/join',
    input: { incidentId },
  },
  {
    name: 'list_incident_chat_messages',
    description:
      'Read messages of an incident chat room. Without cursors returns the latest page. Use `before` to page back to older messages, or `since` (+ `after`) to poll for messages created or edited since a previous read.',
    method: 'GET',
    path: '/v1/incidents/{incidentId}/chat-room/messages',
    input: {
      incidentId,
      since: z.string().optional().describe('Poll cursor returned by a previous read: only changes after it'),
      after: z.string().optional().describe('Page key returned by a previous poll to continue it'),
      before: z.string().optional().describe('Page key returned by a previous read to load older messages'),
    },
  },
  {
    name: 'post_incident_chat_message',
    description: 'Post a message to an open incident chat room as the caller. Room members are notified.',
    method: 'POST',
    path: '/v1/incidents/{incidentId}/chat-room/messages',
    input: {
      incidentId,
      body: z.string().min(1).describe('Message text (Markdown)'),
    },
  },
  {
    name: 'delete_incident_chat_message',
    description: 'Delete a message from an incident chat room. Only its author or an admin can delete it.',
    method: 'DELETE',
    path: '/v1/incidents/{incidentId}/chat-room/messages/{messageId}',
    input: {
      incidentId,
      messageId: z.string().uuid().describe('Chat message UUID'),
    },
  },
];
