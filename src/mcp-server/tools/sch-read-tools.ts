import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';

export function registerSchReadTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'sch_get_all_components',
		'Get all components in the schematic with their properties, positions, rotations, designators, etc.',
		{
			componentType: z
				.enum(['part', 'sheet', 'netflag', 'netport', 'nonElectrical_symbol', 'short_symbol', 'netlabel'])
				.optional()
				.describe('Filter by component type (e.g. "part", "netflag", "netport")'),
			allSchematicPages: z
				.boolean()
				.optional()
				.describe('If true, get components from all schematic pages instead of just the current page'),
		},
		async ({ componentType, allSchematicPages }) => {
			const result = await bridge.send('sch.component.getAll', { componentType, allSchematicPages });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_component',
		'Get one or more schematic components by primitive ID(s)',
		{
			primitiveIds: z
				.union([z.string(), z.array(z.string())])
				.describe('Single primitive ID or array of primitive IDs'),
		},
		async ({ primitiveIds }) => {
			const result = await bridge.send('sch.component.get', { primitiveIds });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_component_pins',
		'Get all pins of a schematic component by its primitive ID',
		{
			primitiveId: z.string().describe('The component primitive ID'),
		},
		async ({ primitiveId }) => {
			const result = await bridge.send('sch.component.getAllPins', { primitiveId });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_all_wires',
		'Get all wires in the schematic, optionally filtered by net name',
		{
			net: z
				.union([z.string(), z.array(z.string())])
				.optional()
				.describe('Filter by net name or array of net names'),
		},
		async ({ net }) => {
			const result = await bridge.send('sch.wire.getAll', { net });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_wire',
		'Get one or more wires by primitive ID(s)',
		{
			primitiveIds: z
				.union([z.string(), z.array(z.string())])
				.describe('Single primitive ID or array of primitive IDs'),
		},
		async ({ primitiveIds }) => {
			const result = await bridge.send('sch.wire.get', { primitiveIds });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_selected',
		'Get all currently selected primitives in the schematic editor',
		{},
		async () => {
			const result = await bridge.send('sch.select.getAll');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_selected_ids',
		'Get primitive IDs of all currently selected primitives in the schematic editor',
		{},
		async () => {
			const result = await bridge.send('sch.select.getAllIds');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_primitive',
		'Get a schematic primitive by its ID with all properties',
		{
			id: z.string().describe('The primitive ID'),
		},
		async ({ id }) => {
			const result = await bridge.send('sch.primitive.get', { id });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_primitive_type',
		'Get the type of a schematic primitive by its ID',
		{
			id: z.string().describe('The primitive ID'),
		},
		async ({ id }) => {
			const result = await bridge.send('sch.primitive.getType', { id });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_primitive_bbox',
		'Get the bounding box of one or more schematic primitives',
		{
			primitiveIds: z.array(z.string()).describe('Array of primitive IDs'),
		},
		async ({ primitiveIds }) => {
			const result = await bridge.send('sch.primitive.getBBox', { primitiveIds });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_netlist',
		'Get the schematic netlist in the specified format',
		{
			type: z
				.enum(['Allegro', 'PADS', 'Protel2', 'JLCEDA', 'EasyEDA', 'DISA'])
				.optional()
				.describe('Netlist format type'),
		},
		async ({ type }) => {
			const result = await bridge.send('sch.netlist.get', { type });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_run_drc',
		'Run Design Rule Check (DRC) on the schematic',
		{
			strict: z.boolean().optional().describe('Whether to run strict DRC checks'),
			userInterface: z.boolean().optional().describe('Whether to show DRC results in UI'),
		},
		async ({ strict, userInterface }) => {
			const result = await bridge.send('sch.drc.check', { strict, userInterface });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
