import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';
import { withDocumentParam, withQueryParams } from './query-params';

const GET_ALL_HANDLER_MAP: Record<string, string> = {
	component: 'pcb.getAll.component',
	track: 'pcb.getAll.line',
	polyline: 'pcb.getAll.polyline',
	via: 'pcb.getAll.via',
	pad: 'pcb.getAll.pad',
	pour: 'pcb.getAll.pour',
	fill: 'pcb.getAll.fill',
	arc: 'pcb.getAll.arc',
	region: 'pcb.getAll.region',
};

const GET_BY_ID_HANDLER_MAP: Record<string, string> = {
	component: 'pcb.get.component',
	track: 'pcb.get.line',
	polyline: 'pcb.get.polyline',
	via: 'pcb.get.via',
	pad: 'pcb.get.pad',
	pour: 'pcb.get.pour',
	fill: 'pcb.get.fill',
	arc: 'pcb.get.arc',
	region: 'pcb.get.region',
};

const PRIMITIVE_TYPES = [
	'component',
	'track',
	'polyline',
	'via',
	'pad',
	'pour',
	'fill',
	'arc',
	'region',
] as const;

export function registerReadTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'pcb_get_all_primitives',
		`Get all primitives of a specific type on the PCB, with optional filters.
Filters by type: component(layer), track/polyline/arc(net,layer), via(net), pad(layer,net), pour/fill(layer,net), region(layer).
Component fields: primitiveId, designator, name, layer, x, y, rotation, primitiveLock, addIntoBom.
Track fields: primitiveId, net, layer, startX, startY, endX, endY, lineWidth.
Via fields: primitiveId, net, x, y, holeDiameter, diameter, viaType.
Pad fields: primitiveId, net, layer, padNumber, x, y.`,
		withQueryParams({
			type: z.enum(PRIMITIVE_TYPES).describe('Primitive type to query'),
			net: z.string().optional().describe('Filter by net name'),
			layer: z.string().optional().describe('Filter by layer (e.g. "TopLayer", "BottomLayer")'),
			primitiveLock: z.boolean().optional().describe('Filter by lock status (true=locked only, false=unlocked only)'),
		}),
		async ({ type, ...rest }) => {
			const result = await bridge.send(GET_ALL_HANDLER_MAP[type], rest);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_primitives_by_id',
		'Get one or more PCB primitives by their type and primitive ID(s)',
		withQueryParams({
			type: z.enum(PRIMITIVE_TYPES).describe('Primitive type'),
			primitiveIds: z
				.union([z.string(), z.array(z.string())])
				.describe('Single primitive ID or array of IDs'),
		}),
		async ({ type, ...rest }) => {
			const result = await bridge.send(GET_BY_ID_HANDLER_MAP[type], rest);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_all_nets',
		'Get all net names in the PCB design',
		withDocumentParam({}),
		async (params) => {
			const result = await bridge.send('pcb.net.getAllNames', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_net_primitives',
		'Get all primitives (tracks, pads, vias, etc.) belonging to a specific net',
		withQueryParams({
			net: z.string().describe('The net name to query'),
			types: z
				.array(z.string())
				.optional()
				.describe('Filter by primitive types (e.g. ["Line", "Via", "Pad"])'),
		}),
		async (params) => {
			const result = await bridge.send('pcb.net.getPrimitives', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_net_length',
		'Get the total routed length of a specific net',
		withDocumentParam({
			net: z.string().describe('The net name'),
		}),
		async (params) => {
			const result = await bridge.send('pcb.net.getLength', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_design_rules',
		'Get the current PCB design rule configuration (clearance, width, etc.)',
		withDocumentParam({}),
		async (params) => {
			const result = await bridge.send('pcb.drc.getRuleConfiguration', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_net_rules',
		'Get net-specific design rules',
		withDocumentParam({}),
		async (params) => {
			const result = await bridge.send('pcb.drc.getNetRules', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_component_pins',
		`Get all pins/pads of a specific component by its primitive ID.
Pin fields: primitiveId, padNumber, net, layer, x, y.`,
		withQueryParams({
			primitiveId: z.string().describe('The component primitive ID'),
		}),
		async (params) => {
			const result = await bridge.send('pcb.component.getPins', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_run_drc',
		'Run Design Rule Check (DRC) on the PCB. Returns violations if verbose is true, or just pass/fail.',
		withQueryParams({
			strict: z.boolean().default(true).describe('Whether to run strict DRC checks'),
			ui: z.boolean().default(false).describe('Whether to show DRC results in UI'),
			verbose: z.boolean().default(true).describe('If true, returns detailed violation list'),
		}),
		async (params) => {
			const result = await bridge.send('pcb.drc.check', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_selected',
		'Get currently selected primitives in the PCB editor',
		withQueryParams({}),
		async (params) => {
			const result = await bridge.send('pcb.select.getAll', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
