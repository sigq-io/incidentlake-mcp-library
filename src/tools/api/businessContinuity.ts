import { z } from 'zod';
import { requiredNonEmptyStringArraySchema } from '../../coerceArrays';
import type { ApiToolDefinition } from './defineApiTool';

const businessOperationId = z.string().uuid().describe('Business operation UUID');
const serviceId = z.string().uuid().describe('CMDB service UUID');
const locationId = z.string().uuid().describe('Location UUID');
const scenarioId = z.string().uuid().describe('BCP scenario UUID');

const LOCATION_TYPES = ['data_center', 'office', 'branch', 'cloud_region', 'other'] as const;
const SCENARIO_TYPES = ['system_failure', 'disaster', 'cyber', 'other'] as const;

const nullableText = (max: number, what: string) =>
  z.string().max(max).nullable().optional().describe(`${what} (null clears)`);

const locationFields = {
  code: nullableText(50, 'Short location code'),
  locationType: z.enum(LOCATION_TYPES).nullable().optional().describe('Location type (null clears)'),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .nullable()
    .optional()
    .describe('ISO 3166-1 alpha-2 country code, e.g. JP (null clears)'),
  region: nullableText(255, 'Region or prefecture'),
  city: nullableText(255, 'City'),
  address: nullableText(2000, 'Street address'),
  description: nullableText(5000, 'Description'),
};

const businessOperationFields = {
  ownerDepartment: nullableText(255, 'Owning department'),
  description: nullableText(20000, 'Description'),
  criticality: z.number().int().min(1).max(5).nullable().optional().describe('Criticality from 1 to 5 (null clears)'),
  rtoMinutes: z
    .number()
    .int()
    .min(0)
    .max(525600)
    .nullable()
    .optional()
    .describe('Recovery time objective in minutes (null clears)'),
};

const scenarioFields = {
  triggerCondition: nullableText(5000, 'When this scenario applies'),
  impactSummary: nullableText(5000, 'Impact on the business operation'),
  responseProcedure: nullableText(20000, 'Response procedure (Markdown)'),
  fallbackTarget: nullableText(5000, 'Fallback site, system or manual process'),
};

export const businessContinuityTools: ApiToolDefinition[] = [
  {
    name: 'list_service_business_operations',
    description:
      'List the business operations that rely on a CMDB service, with usage, impact when down and fallback procedure. Use it to judge the business impact of an outage.',
    method: 'GET',
    path: '/v1/services/{serviceId}/business-operations',
    input: { serviceId },
  },
  {
    name: 'list_locations',
    description: 'List physical locations (data centers, offices, cloud regions) with their service counts.',
    method: 'GET',
    path: '/v1/locations',
  },
  {
    name: 'create_location',
    description: 'Create a physical location that CMDB services can be placed in. Names must be unique.',
    method: 'POST',
    path: '/v1/locations',
    input: {
      name: z.string().min(1).max(255).describe('Location name (unique in the tenant)'),
      ...locationFields,
    },
  },
  {
    name: 'assign_services_to_location',
    description:
      'Place CMDB services in a location, or remove them from any location with locationId null. Returns the number of services updated.',
    method: 'POST',
    path: '/v1/locations/assign-services',
    input: {
      serviceIds: requiredNonEmptyStringArraySchema.describe('CMDB service UUIDs (max 5000)'),
      locationId: z.string().uuid().nullable().describe('Target location UUID, or null to unassign'),
    },
    retries: 2,
  },
  {
    name: 'update_location',
    description: 'Update a location. Only the fields sent are changed.',
    method: 'PATCH',
    path: '/v1/locations/{locationId}',
    input: {
      locationId,
      name: z.string().min(1).max(255).optional().describe('New name (unique in the tenant)'),
      ...locationFields,
    },
  },
  {
    name: 'delete_location',
    description: 'Delete a location. Services placed there are kept with no location.',
    method: 'DELETE',
    path: '/v1/locations/{locationId}',
    input: { locationId },
  },
  {
    name: 'list_business_operations',
    description: 'List business operations (BCP) with their criticality, RTO and linked service and scenario counts.',
    method: 'GET',
    path: '/v1/business-operations',
  },
  {
    name: 'create_business_operation',
    description: 'Create a business operation for business continuity planning. Names must be unique.',
    method: 'POST',
    path: '/v1/business-operations',
    input: {
      name: z.string().min(1).max(255).describe('Business operation name (unique in the tenant)'),
      ...businessOperationFields,
    },
  },
  {
    name: 'get_business_operation',
    description: 'Get a business operation with its service links and BCP scenarios.',
    method: 'GET',
    path: '/v1/business-operations/{businessOperationId}',
    input: { businessOperationId },
  },
  {
    name: 'update_business_operation',
    description: 'Update a business operation. Only the fields sent are changed.',
    method: 'PATCH',
    path: '/v1/business-operations/{businessOperationId}',
    input: {
      businessOperationId,
      name: z.string().min(1).max(255).optional().describe('New name (unique in the tenant)'),
      ...businessOperationFields,
    },
  },
  {
    name: 'delete_business_operation',
    description: 'Delete a business operation together with its service links and BCP scenarios.',
    method: 'DELETE',
    path: '/v1/business-operations/{businessOperationId}',
    input: { businessOperationId },
  },
  {
    name: 'link_service_to_business_operation',
    description:
      'Record that a business operation relies on a CMDB service, or update that link. Returns the link.',
    method: 'PUT',
    path: '/v1/business-operations/{businessOperationId}/services/{serviceId}',
    input: {
      businessOperationId,
      serviceId,
      usageDescription: nullableText(5000, 'How the operation uses the service'),
      impactWhenDown: nullableText(5000, 'Impact on the operation when the service is down'),
      fallbackProcedure: nullableText(5000, 'Fallback procedure while the service is down'),
    },
  },
  {
    name: 'unlink_service_from_business_operation',
    description: 'Remove the link between a business operation and a CMDB service.',
    method: 'DELETE',
    path: '/v1/business-operations/{businessOperationId}/services/{serviceId}',
    input: { businessOperationId, serviceId },
  },
  {
    name: 'list_business_service_links',
    description: 'List every business operation to CMDB service link in the tenant.',
    method: 'GET',
    path: '/v1/business-service-links',
  },
  {
    name: 'create_bcp_scenario',
    description: 'Add a BCP scenario (what to do when something fails) to a business operation.',
    method: 'POST',
    path: '/v1/business-operations/{businessOperationId}/scenarios',
    input: {
      businessOperationId,
      scenarioType: z.enum(SCENARIO_TYPES).describe('Scenario type'),
      title: z.string().min(1).max(255).describe('Scenario title'),
      ...scenarioFields,
    },
  },
  {
    name: 'update_bcp_scenario',
    description: 'Update a BCP scenario. Only the fields sent are changed.',
    method: 'PATCH',
    path: '/v1/business-operations/{businessOperationId}/scenarios/{scenarioId}',
    input: {
      businessOperationId,
      scenarioId,
      scenarioType: z.enum(SCENARIO_TYPES).optional().describe('Scenario type'),
      title: z.string().min(1).max(255).optional().describe('Scenario title'),
      ...scenarioFields,
    },
  },
  {
    name: 'delete_bcp_scenario',
    description: 'Delete a BCP scenario from a business operation.',
    method: 'DELETE',
    path: '/v1/business-operations/{businessOperationId}/scenarios/{scenarioId}',
    input: { businessOperationId, scenarioId },
  },
];
