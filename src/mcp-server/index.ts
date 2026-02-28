import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { WebSocketBridge } from './bridge';
import { registerReadTools } from './tools/read-tools';
import { registerWriteTools } from './tools/write-tools';
import { registerAnalysisTools } from './tools/analysis-tools';
import { registerSchReadTools } from './tools/sch-read-tools';
import { registerSchWriteTools } from './tools/sch-write-tools';
import { registerLibTools } from './tools/lib-tools';
import { registerManufactureTools } from './tools/manufacture-tools';
import { registerPcbDrcTools } from './tools/pcb-drc-tools';
import { registerPcbLayerTools } from './tools/pcb-layer-tools';
import { registerEditorTools } from './tools/editor-tools';

const PORT_RANGE_START = Number(process.env.EDA_WS_PORT) || 15168;
const PORT_RANGE_SIZE = Number(process.env.EDA_WS_PORT_RANGE) || 20;

async function main() {
	const bridge = await WebSocketBridge.startOnAvailablePort(PORT_RANGE_START, PORT_RANGE_SIZE);

	const server = new McpServer({
		name: 'easyeda-agent-mcp-server',
		version: '1.0.0',
	});

	server.tool(
		'server_info',
		'Get MCP server status: WebSocket port, connection state, and allowed origins',
		{},
		async () => ({
			content: [{
				type: 'text' as const,
				text: JSON.stringify({
					wsPort: bridge.getPort(),
					extensionConnected: bridge.isConnected(),
					allowAllOrigins: process.env.EDA_WS_ALLOW_ALL_ORIGINS === '1',
				}, null, 2),
			}],
		}),
	);

	registerReadTools(server, bridge);
	registerWriteTools(server, bridge);
	registerAnalysisTools(server, bridge);
	registerSchReadTools(server, bridge);
	registerSchWriteTools(server, bridge);
	registerLibTools(server, bridge);
	registerManufactureTools(server, bridge);
	registerPcbDrcTools(server, bridge);
	registerPcbLayerTools(server, bridge);
	registerEditorTools(server, bridge);

	const transport = new StdioServerTransport();
	await server.connect(transport);

	console.error('[MCP] EasyEDA Agent MCP Server started');
	console.error(`[MCP] WebSocket Server on port ${bridge.getPort()}, waiting for EDA Pro Extension...`);

	process.on('SIGINT', async () => {
		await bridge.stop();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		await bridge.stop();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error('[MCP] Fatal error:', err);
	process.exit(1);
});
