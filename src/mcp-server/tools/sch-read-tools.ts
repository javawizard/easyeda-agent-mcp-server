import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';
import { queryParams, withQueryParams } from './query-params';

export function registerSchReadTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'sch_get_all_components',
		`Get all components in the schematic with their properties, positions, rotations, designators, etc.
Fields: primitiveId, componentType, designator, name, x, y, rotation, mirror, addIntoBom, addIntoPcb, footprint, manufacturer, net, otherProperty.`,
		withQueryParams({
			componentType: z
				.enum(['part', 'sheet', 'netflag', 'netport', 'nonElectrical_symbol', 'short_symbol', 'netlabel'])
				.optional()
				.describe('Filter by component type (e.g. "part", "netflag", "netport")'),
			allSchematicPages: z
				.boolean()
				.optional()
				.describe('If true, get components from all schematic pages instead of just the current page'),
		}),
		async ({ componentType, allSchematicPages, fields, filter, limit }) => {
			const result = await bridge.send('sch.component.getAll', { componentType, allSchematicPages, fields, filter, limit });
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
		`Get all pins of a schematic component by its primitive ID.
Pin fields: primitiveId, pinNumber, name, net, x, y, rotation.`,
		withQueryParams({
			primitiveId: z.string().describe('The component primitive ID'),
		}),
		async ({ primitiveId, fields, filter, limit }) => {
			const result = await bridge.send('sch.component.getAllPins', { primitiveId, fields, filter, limit });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_all_wires',
		'Get all wires in the schematic, optionally filtered by net name',
		withQueryParams({
			net: z
				.union([z.string(), z.array(z.string())])
				.optional()
				.describe('Filter by net name or array of net names'),
		}),
		async ({ net, fields, filter, limit }) => {
			const result = await bridge.send('sch.wire.getAll', { net, fields, filter, limit });
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
		withQueryParams({}),
		async ({ fields, filter, limit }) => {
			const result = await bridge.send('sch.select.getAll', { fields, filter, limit });
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
		withQueryParams({
			type: z
				.enum(['Allegro', 'PADS', 'Protel2', 'JLCEDA', 'EasyEDA', 'DISA'])
				.optional()
				.describe('Netlist format type'),
		}),
		async ({ type, fields, filter, limit }) => {
			const result = await bridge.send('sch.netlist.get', { type, fields, filter, limit });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_run_drc',
		'Run Design Rule Check (DRC) on the schematic',
		withQueryParams({
			strict: z.boolean().optional().describe('Whether to run strict DRC checks'),
			userInterface: z.boolean().optional().describe('Whether to show DRC results in UI'),
		}),
		async ({ strict, userInterface, fields, filter, limit }) => {
			const result = await bridge.send('sch.drc.check', { strict, userInterface, fields, filter, limit });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
