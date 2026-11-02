import { z } from 'zod';
import { coercedTagArraySchema } from '../../coerceArrays';
import type { ApiToolDefinition } from './defineApiTool';
import { AI_TIMEOUT_MS } from './defineApiTool';

const serviceId = z.string().uuid().describe('CMDB service UUID');
const includeDrills = z.boolean().optional().describe('Include drill incidents (default false)');

const CI_CLASSES = [
  'business_service',
  'application',
  'database',
  'infrastructure',
  'network',
  'vendor_saas',
] as const;
const continuityMinutes = (what: string) =>
  z.number().int().min(0).max(525600).nullable().optional().describe(`${what} in minutes (null clears)`);

export const cmdbTools: ApiToolDefinition[] = [
  {
    name: 'get_service_incident_counts',
    description: 'Get the number of incidents per CMDB service, as a map of service ID to count.',
    method: 'GET',
    path: '/v1/services/incident-counts',
    input: { includeDrills },
  },
  {
    name: 'search_service_tags',
    description: 'Search the tags used on CMDB services (up to 50 matches). Omit q to list tags.',
    method: 'GET',
    path: '/v1/services/tags/search',
    input: {
      q: z.string().optional().describe('Text the tag contains'),
    },
  },
  {
    name: 'list_service_incidents',
    description: 'List the incidents that affect a CMDB service. Incidents the caller cannot see are omitted.',
    method: 'GET',
    path: '/v1/services/{serviceId}/incidents',
    input: { serviceId, includeDrills },
  },
  {
    name: 'replace_service_tags',
    description: 'Replace the full tag list of a CMDB service (duplicates removed; an empty list clears it).',
    method: 'PATCH',
    path: '/v1/services/{serviceId}/tags',
    input: {
      serviceId,
      tags: coercedTagArraySchema.describe('The complete new tag list'),
    },
  },
  {
    name: 'update_service_itil_attributes',
    description:
      'Update ITIL attributes of a CMDB service: CI class, RTO/RPO, service catalog publication, owner, support hours, request URL and location. Only the fields sent are changed.',
    method: 'PATCH',
    path: '/v1/services/{serviceId}/itil-attributes',
    input: {
      serviceId,
      ciClass: z.enum(CI_CLASSES).nullable().optional().describe('Configuration item class (null clears)'),
      rtoMinutes: continuityMinutes('Recovery time objective'),
      rpoMinutes: continuityMinutes('Recovery point objective'),
      catalogPublished: z.boolean().optional().describe('Show the service in the published service catalog'),
      serviceOwnerId: z.string().uuid().nullable().optional().describe('Owner tenant member UUID (null clears)'),
      supportHours: z.string().max(255).nullable().optional().describe('Support hours, e.g. "24/7" (null clears)'),
      requestUrl: z.string().url().nullable().optional().describe('http(s) URL of the request form (null clears)'),
      locationId: z.string().uuid().nullable().optional().describe('Location UUID (null clears)'),
    },
  },
  {
    name: 'delete_service_dependency_edge',
    description: 'Delete a CMDB dependency edge by its numeric edge ID, as returned by the dependency list tools.',
    method: 'DELETE',
    path: '/v1/service-dependencies/{dependencyId}',
    input: {
      dependencyId: z.number().int().positive().describe('Numeric dependency edge ID'),
    },
  },
  {
    name: 'extract_service_dependencies',
    description:
      'Extract service dependencies from text (architecture notes, runbooks) and add them to the CMDB graph. Returns the numbers of edges created and updated. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/service-dependencies/extract',
    input: {
      content: z.string().min(1).max(50000).describe('Text describing the services and their dependencies'),
      sourceUrl: z.string().optional().describe('URL the text came from, recorded as the source'),
    },
    timeoutMs: AI_TIMEOUT_MS,
  },
  {
    name: 'build_service_dependency_graph',
    description:
      'Start rebuilding the CMDB dependency graph from all knowledge sources in the background; returns immediately with status processing. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/service-dependencies/build-graph',
    input: {
      additionalContent: z.string().max(50000).optional().describe('Extra text to analyse along with the knowledge sources'),
      additionalSourceUrl: z.string().optional().describe('URL the extra text came from'),
    },
  },
  {
    name: 'discover_reverse_service_dependencies',
    description:
      'Start discovering missing reverse dependencies for services that already have dependencies, in the background; returns immediately with status processing. (AI; consumes credits)',
    method: 'POST',
    path: '/v1/service-dependencies/discover-reverse',
  },
  {
    name: 'get_service_catalog',
    description:
      'Get the published service catalog: services with their owner, support hours, request URL, SLA, RTO, agreements and open incident count.',
    method: 'GET',
    path: '/v1/service-catalog',
  },
  {
    name: 'list_netbox_devices',
    description: 'List devices mirrored from NetBox, optionally filtered by search text.',
    method: 'GET',
    path: '/v1/netbox/devices',
    input: {
      q: z.string().max(200).optional().describe('Search text'),
      limit: z.number().int().min(1).max(200).optional().describe('Maximum number of devices (default 50)'),
    },
  },
  {
    name: 'get_netbox_device',
    description: 'Get one NetBox device mirrored into the CMDB by its NetBox ID.',
    method: 'GET',
    path: '/v1/netbox/devices/{netboxId}',
    input: {
      netboxId: z.number().int().positive().describe('NetBox device ID'),
    },
  },
  {
    name: 'get_service_netbox_hardware',
    description: 'Get the NetBox device behind a CMDB service. Returns data null when the service is not NetBox-backed.',
    method: 'GET',
    path: '/v1/netbox/services/{serviceId}/hardware',
    input: { serviceId },
  },
];
