import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';
import { withInstanceParam } from './query-params';

export function registerEditorTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'project_get_structure',
		'Get the current project structure: boards (with their schematics/PCBs), standalone schematics with pages, standalone PCBs, and panels. Also shows which document is currently focused.',
		withInstanceParam({}),
		async ({ instance_id }) => {
			const result = await bridge.send('editor.project.getStructure', { instance_id });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'editor_get_current_document',
		'Get detailed info about the currently focused document. For schematic pages, includes parent schematic info. For PCBs, includes associated board info.',
		withInstanceParam({}),
		async ({ instance_id }) => {
			const result = await bridge.send('editor.getCurrentDocument', { instance_id });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'editor_open_document',
		'Open/navigate to a specific document by UUID. Works for schematic page UUIDs, PCB UUIDs, and panel UUIDs.',
		withInstanceParam({
			documentUuid: z.string().describe('The UUID of the document to open'),
		}),
		async ({ documentUuid, instance_id }) => {
			const result = await bridge.send('editor.openDocument', { documentUuid, instance_id });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'editor_get_open_tabs',
		'Get all currently open tabs in the editor, with the active tab marked. Also returns the split screen structure.',
		withInstanceParam({}),
		async ({ instance_id }) => {
			const result = await bridge.send('editor.getOpenTabs', { instance_id });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'editor_capture_screenshot',
		[
			'Capture a screenshot of the current design as an image.',
			'For schematics: exports as PNG using the document export API. Use "theme" to control appearance and "scope" to control what is captured.',
			'For PCBs: attempts canvas capture (PNG), falls back to PDF export if unavailable.',
			'Pass a "document" parameter to capture a specific tab without manually switching.',
		].join(' '),
		withInstanceParam({
			theme: z.enum(['Default', 'White on Black', 'Black on White']).default('Default')
				.describe('Color theme for schematic export'),
			scope: z.enum(['Current Schematic Page', 'Current Schematic', 'All Schematic']).default('Current Schematic Page')
				.describe('What to include in the schematic export'),
		}),
		async ({ theme, scope, instance_id }) => {
			const result = await bridge.send('editor.captureScreenshot', {
				theme, scope, instance_id,
			}) as { image: string; mimeType: string; size: number; format?: string };

			if (result.mimeType === 'application/pdf') {
				// Can't display PDFs inline — return as text with base64 data
				return {
					content: [{
						type: 'text' as const,
						text: `PCB screenshot exported as PDF (${result.size} bytes). Canvas capture was not available.\n\nTo view: save the base64 data below to a .pdf file.\n\nBase64 data (${result.image.length} chars): [PDF data omitted — use pcb_export tool to save to disk instead]`,
					}],
				};
			}

			return {
				content: [{
					type: 'image' as const,
					data: result.image,
					mimeType: result.mimeType,
				}],
			};
		},
	);
}
