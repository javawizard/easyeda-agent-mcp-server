import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';

export function registerWriteTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'pcb_move_component',
		'Move and/or rotate a component. Can also change its layer (flip), lock status, designator, etc.',
		{
			primitiveId: z.string().describe('The component primitive ID'),
			x: z.number().optional().describe('New X coordinate'),
			y: z.number().optional().describe('New Y coordinate'),
			rotation: z.number().optional().describe('New rotation angle in degrees'),
			layer: z.string().optional().describe('Target layer ("TopLayer" or "BottomLayer")'),
			primitiveLock: z.boolean().optional().describe('Whether to lock the component'),
			designator: z.string().optional().describe('New designator (e.g. "R1", "U2")'),
		},
		async ({ primitiveId, ...property }) => {
			const result = await bridge.send('pcb.modify.component', { primitiveId, property });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_create_track',
		'Create a single track segment (line) between two points on a specified layer and net',
		{
			net: z.string().describe('Net name for the track'),
			layer: z.string().describe('Layer name (e.g. "TopLayer", "BottomLayer", "InnerLayer1")'),
			startX: z.number().describe('Start X coordinate'),
			startY: z.number().describe('Start Y coordinate'),
			endX: z.number().describe('End X coordinate'),
			endY: z.number().describe('End Y coordinate'),
			lineWidth: z.number().optional().describe('Track width (default uses design rules)'),
		},
		async (params) => {
			const result = await bridge.send('pcb.create.line', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_create_polyline_track',
		'Create a multi-segment polyline track defined by a series of points',
		{
			net: z.string().describe('Net name for the track'),
			layer: z.string().describe('Layer name'),
			polygon: z
				.array(
					z.object({
						x: z.number(),
						y: z.number(),
					}),
				)
				.min(2)
				.describe('Array of points [{x, y}, ...] defining the polyline path'),
			lineWidth: z.number().optional().describe('Track width'),
		},
		async (params) => {
			const result = await bridge.send('pcb.create.polyline', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_delete_tracks',
		'Delete track segments by their IDs. Handles both Line and Polyline types.',
		{
			lineIds: z.array(z.string()).optional().describe('Array of Line primitive IDs to delete'),
			polylineIds: z.array(z.string()).optional().describe('Array of Polyline primitive IDs to delete'),
		},
		async ({ lineIds, polylineIds }) => {
			const results: Record<string, unknown> = {};
			if (lineIds && lineIds.length > 0) {
				results.lines = await bridge.send('pcb.delete.line', { ids: lineIds });
			}
			if (polylineIds && polylineIds.length > 0) {
				results.polylines = await bridge.send('pcb.delete.polyline', { ids: polylineIds });
			}
			return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
		},
	);

	server.tool(
		'pcb_modify_track',
		'Modify properties of an existing track segment (line)',
		{
			primitiveId: z.string().describe('The track primitive ID'),
			net: z.string().optional().describe('New net name'),
			layer: z.string().optional().describe('New layer'),
			startX: z.number().optional().describe('New start X'),
			startY: z.number().optional().describe('New start Y'),
			endX: z.number().optional().describe('New end X'),
			endY: z.number().optional().describe('New end Y'),
			lineWidth: z.number().optional().describe('New track width'),
		},
		async ({ primitiveId, ...property }) => {
			const result = await bridge.send('pcb.modify.line', { primitiveId, property });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_create_via',
		'Create a via at the specified position',
		{
			net: z.string().describe('Net name'),
			x: z.number().describe('X coordinate'),
			y: z.number().describe('Y coordinate'),
			holeDiameter: z.number().describe('Hole diameter'),
			diameter: z.number().describe('Via pad diameter'),
			viaType: z.string().optional().describe('Via type (e.g. "Through", "BlindBuried")'),
		},
		async (params) => {
			const result = await bridge.send('pcb.create.via', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_delete_via',
		'Delete one or more vias by their IDs',
		{
			ids: z.array(z.string()).describe('Array of via primitive IDs to delete'),
		},
		async ({ ids }) => {
			const result = await bridge.send('pcb.delete.via', { ids });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_save',
		'Save the current PCB document',
		{
			uuid: z.string().optional().describe('Document UUID (uses current document if not provided)'),
		},
		async ({ uuid }) => {
			const result = await bridge.send('pcb.document.save', { uuid });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
