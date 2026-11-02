import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Toolset } from '../../toolsets';
import { registerApiTool, type ApiToolDefinition } from './defineApiTool';
import { adminTools } from './admin';
import { businessContinuityTools } from './businessContinuity';
import { changeTools } from './changes';
import { cmdbTools } from './cmdb';
import { emergencyTools } from './emergency';
import { evidenceTools } from './evidence';
import { improvementTools } from './improvement';
import { incidentChatTools } from './incidentChat';
import { incidentResponseTools } from './incidentResponse';
import { knowledgeTools } from './knowledge';
import { specificationTools } from './specifications';
import { taskBoardTools } from './taskBoard';
import { workflowTools } from './workflow';

export const TOOLSET_TOOLS: Record<Toolset, ApiToolDefinition[]> = {
  incidents: [...incidentResponseTools, ...incidentChatTools],
  task_board: taskBoardTools,
  problems: improvementTools,
  knowledge: [...knowledgeTools, ...evidenceTools],
  changes: changeTools,
  specs: specificationTools,
  emergency: emergencyTools,
  services: [...cmdbTools, ...businessContinuityTools],
  settings: [...adminTools, ...workflowTools],
};

export function registerApiTools(
  server: McpServer,
  toolsets: ReadonlySet<Toolset>,
  { localFileAccess }: { localFileAccess: boolean },
): void {
  for (const toolset of toolsets) {
    for (const def of TOOLSET_TOOLS[toolset]) {
      if (!localFileAccess && (def.upload || def.download)) continue;
      registerApiTool(server, def);
    }
  }
}
