import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';

export function registerEditorTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'project_get_structure',
		'Get the current project structure: boards (with their schematics/PCBs), standalone schematics with pages, standalone PCBs, and panels. Also shows which document is currently focused.',
		{},
		async () => {
			const result = await bridge.send('editor.project.getStructure');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'editor_get_current_document',
		'Get detailed info about the currently focused document. For schematic pages, includes parent schematic info. For PCBs, includes associated board info.',
		{},
		async () => {
			const result = await bridge.send('editor.getCurrentDocument');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'editor_open_document',
		'Open/navigate to a specific document by UUID. Works for schematic page UUIDs, PCB UUIDs, and panel UUIDs.',
		{
			documentUuid: z.string().describe('The UUID of the document to open'),
		},
		async ({ documentUuid }) => {
			const result = await bridge.send('editor.openDocument', { documentUuid });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'editor_get_open_tabs',
		'Get all currently open tabs in the editor, with the active tab marked. Also returns the split screen structure.',
		{},
		async () => {
			const result = await bridge.send('editor.getOpenTabs');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
