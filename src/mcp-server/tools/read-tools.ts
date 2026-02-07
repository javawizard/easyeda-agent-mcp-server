import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';

export function registerReadTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'pcb_get_all_components',
		'Get all components on the PCB with their positions, rotations, layers, designators and properties',
		{
			layer: z.string().optional().describe('Filter by layer (e.g. "TopLayer", "BottomLayer")'),
		},
		async ({ layer }) => {
			const result = await bridge.send('pcb.getAll.component', { layer });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_all_tracks',
		'Get all track segments (lines) on the PCB, optionally filtered by net and layer',
		{
			net: z.string().optional().describe('Filter by net name'),
			layer: z.string().optional().describe('Filter by layer'),
		},
		async ({ net, layer }) => {
			const result = await bridge.send('pcb.getAll.line', { net, layer });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_all_polyline_tracks',
		'Get all polyline tracks on the PCB, optionally filtered by net and layer',
		{
			net: z.string().optional().describe('Filter by net name'),
			layer: z.string().optional().describe('Filter by layer'),
		},
		async ({ net, layer }) => {
			const result = await bridge.send('pcb.getAll.polyline', { net, layer });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_all_vias',
		'Get all vias on the PCB, optionally filtered by net',
		{
			net: z.string().optional().describe('Filter by net name'),
		},
		async ({ net }) => {
			const result = await bridge.send('pcb.getAll.via', { net });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_all_pads',
		'Get all pads on the PCB, optionally filtered by layer, net and pad type',
		{
			layer: z.string().optional().describe('Filter by layer'),
			net: z.string().optional().describe('Filter by net name'),
		},
		async ({ layer, net }) => {
			const result = await bridge.send('pcb.getAll.pad', { layer, net });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_all_nets',
		'Get all net names in the PCB design',
		{},
		async () => {
			const result = await bridge.send('pcb.net.getAllNames');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_net_primitives',
		'Get all primitives (tracks, pads, vias, etc.) belonging to a specific net',
		{
			net: z.string().describe('The net name to query'),
			types: z
				.array(z.string())
				.optional()
				.describe('Filter by primitive types (e.g. ["Line", "Via", "Pad"])'),
		},
		async ({ net, types }) => {
			const result = await bridge.send('pcb.net.getPrimitives', { net, types });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_net_length',
		'Get the total routed length of a specific net',
		{
			net: z.string().describe('The net name'),
		},
		async ({ net }) => {
			const result = await bridge.send('pcb.net.getLength', { net });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_design_rules',
		'Get the current PCB design rule configuration (clearance, width, etc.)',
		{},
		async () => {
			const result = await bridge.send('pcb.drc.getRuleConfiguration');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_net_rules',
		'Get net-specific design rules',
		{},
		async () => {
			const result = await bridge.send('pcb.drc.getNetRules');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_component_pins',
		'Get all pins/pads of a specific component by its primitive ID',
		{
			primitiveId: z.string().describe('The component primitive ID'),
		},
		async ({ primitiveId }) => {
			const result = await bridge.send('pcb.component.getPins', { primitiveId });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_run_drc',
		'Run Design Rule Check (DRC) on the PCB. Returns violations if verbose is true, or just pass/fail.',
		{
			strict: z.boolean().default(true).describe('Whether to run strict DRC checks'),
			ui: z.boolean().default(false).describe('Whether to show DRC results in UI'),
			verbose: z.boolean().default(true).describe('If true, returns detailed violation list'),
		},
		async ({ strict, ui, verbose }) => {
			const result = await bridge.send('pcb.drc.check', { strict, ui, verbose });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_selected',
		'Get currently selected primitives in the PCB editor',
		{},
		async () => {
			const result = await bridge.send('pcb.select.getAll');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
