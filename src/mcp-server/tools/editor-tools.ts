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
			'Capture a screenshot of the current design view as a PNG image.',
			'Modes:',
			'  - "full": Zoom to fit all primitives, then capture (default)',
			'  - "board": Zoom to PCB board outline, then capture (PCB only; falls back to full for schematics)',
			'  - "region": Zoom to a specific coordinate region, then capture (requires left/right/top/bottom)',
			'  - "components": Select specific primitives, zoom to fit them, capture, then restore previous selection',
			'  - "current": Capture the current view as-is without changing zoom',
			'Use "full" or "board" for an overview, "components" to focus on specific parts, "region" for exact coordinates.',
		].join('\n'),
		withInstanceParam({
			mode: z.enum(['full', 'board', 'region', 'components', 'current']).default('full')
				.describe('Screenshot framing mode'),
			left: z.number().optional().describe('Left bound for region mode'),
			right: z.number().optional().describe('Right bound for region mode'),
			top: z.number().optional().describe('Top bound for region mode'),
			bottom: z.number().optional().describe('Bottom bound for region mode'),
			primitiveIds: z.array(z.string()).optional()
				.describe('Primitive IDs to frame for components mode (from get_all_components, etc.)'),
		}),
		async ({ mode, left, right, top, bottom, primitiveIds, instance_id }) => {
			const result = await bridge.send('editor.captureScreenshot', {
				mode, left, right, top, bottom, primitiveIds, instance_id,
			}) as { image: string; mimeType: string; size: number; viewport?: any };

			const content: Array<{ type: 'image'; data: string; mimeType: string } | { type: 'text'; text: string }> = [
				{ type: 'image' as const, data: result.image, mimeType: result.mimeType },
			];

			if (result.viewport) {
				content.push({
					type: 'text' as const,
					text: `Viewport bounds: ${JSON.stringify(result.viewport)}`,
				});
			}

			return { content };
		},
	);
}
