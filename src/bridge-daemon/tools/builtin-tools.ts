import { z } from 'zod';
import type { ToolDef, ToolContext } from '../types';

/**
 * Built-in tools that previously lived in mcp-server/index.ts. These are
 * "metadata" tools — they introspect the daemon's view of connected
 * extensions rather than forwarding RPCs to a specific extension.
 */
export function builtinTools(ctx: ToolContext): ToolDef[] {
	return [
		{
			name: 'server_info',
			description: 'Get MCP server status: WebSocket port, connection state, connected instances, and allowed origins',
			inputShape: {},
			handler: async () => {
				const instances = ctx.getConnectedInstances();
				return {
					content: [{
						type: 'text' as const,
						text: JSON.stringify({
							wsPort: ctx.getPort(),
							extensionConnected: ctx.isConnected(),
							connectedInstanceCount: instances.length,
							instances: instances.map((info) => ({
								instanceId: info.instanceId,
								projectName: info.projectName,
								currentDocument: info.currentDocument,
								documentType: info.documentType,
							})),
							allowAllOrigins: process.env.EDA_WS_ALLOW_ALL_ORIGINS === '1',
						}, null, 2),
					}],
				};
			},
		},
		{
			name: 'list_instances',
			description: 'List all connected EasyEDA Pro instances with their current state (project, active document, open tabs). Use this to find the instance_id you need for other tools when multiple instances are connected.',
			inputShape: {},
			handler: async () => {
				await ctx.refreshAllInstanceInfo();
				const instances = ctx.getConnectedInstances();

				if (instances.length === 0) {
					return {
						content: [{
							type: 'text' as const,
							text: 'No EasyEDA Pro instances are connected. Please open EasyEDA Pro and click "Connect Claude" in the Claude menu.',
						}],
					};
				}

				return {
					content: [{
						type: 'text' as const,
						text: JSON.stringify({
							connectedInstanceCount: instances.length,
							instances: instances.map((info) => ({
								instanceId: info.instanceId,
								projectName: info.projectName,
								currentDocument: info.currentDocument,
								documentType: info.documentType,
								documents: info.documents,
								connectedAt: new Date(info.connectedAt).toISOString(),
							})),
							note: instances.length === 1
								? 'Only one instance connected — instance_id can be omitted from tool calls (auto-selected).'
								: 'Multiple instances connected — pass instance_id to tool calls to target a specific instance.',
						}, null, 2),
					}],
				};
			},
		},
	];
}

// Silence unused-z lint warning if no schema uses it; keep import so future
// additions have it ready.
void z;
