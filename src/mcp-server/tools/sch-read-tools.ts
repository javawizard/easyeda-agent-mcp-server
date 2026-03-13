import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';
import { withDocumentParam, withQueryParams } from './query-params';

export function registerSchReadTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'sch_get_all_components',
		`Get all components in the schematic with their properties, positions, rotations, designators, etc.
Fields: primitiveId, componentType, designator, name, x, y, rotation, mirror, addIntoBom, addIntoPcb, footprint, manufacturer, net, otherProperty.
Note: name often contains EasyEDA template expressions like ={Manufacturer Part} rather than resolved values. For resolved names, use sch_get_connectivity.`,
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
		async (params) => {
			const result = await bridge.send('sch.component.getAll', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_component',
		'Get one or more schematic components by primitive ID(s)',
		withDocumentParam({
			primitiveIds: z
				.union([z.string(), z.array(z.string())])
				.describe('Single primitive ID or array of primitive IDs'),
		}),
		async (params) => {
			const result = await bridge.send('sch.component.get', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_component_pins',
		`Get all pins of a schematic component by its primitive ID.
Pin fields: primitiveId, pinNumber, name, net, x, y, rotation.
Each pin includes a net field with the net name it is connected to (empty string if unconnected).`,
		withQueryParams({
			primitiveId: z.string().describe('The component primitive ID'),
		}),
		async (params) => {
			const result = await bridge.send('sch.component.getAllPins', params);
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
		async (params) => {
			const result = await bridge.send('sch.wire.getAll', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_wire',
		'Get one or more wires by primitive ID(s)',
		withDocumentParam({
			primitiveIds: z
				.union([z.string(), z.array(z.string())])
				.describe('Single primitive ID or array of primitive IDs'),
		}),
		async (params) => {
			const result = await bridge.send('sch.wire.get', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_selected',
		'Get all currently selected primitives in the schematic editor',
		withQueryParams({}),
		async (params) => {
			const result = await bridge.send('sch.select.getAll', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_selected_ids',
		'Get primitive IDs of all currently selected primitives in the schematic editor',
		withDocumentParam({}),
		async (params) => {
			const result = await bridge.send('sch.select.getAllIds', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_primitive',
		'Get a schematic primitive by its ID with all properties',
		withDocumentParam({
			id: z.string().describe('The primitive ID'),
		}),
		async (params) => {
			const result = await bridge.send('sch.primitive.get', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_primitive_type',
		'Get the type of a schematic primitive by its ID',
		withDocumentParam({
			id: z.string().describe('The primitive ID'),
		}),
		async (params) => {
			const result = await bridge.send('sch.primitive.getType', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_primitive_bbox',
		'Get the bounding box of one or more schematic primitives',
		withDocumentParam({
			primitiveIds: z.array(z.string()).describe('Array of primitive IDs'),
		}),
		async (params) => {
			const result = await bridge.send('sch.primitive.getBBox', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_netlist',
		`Get the raw schematic netlist in the specified format. WARNING: The JLCEDA format response is very large (100KB+).
Prefer sch_get_connectivity for connectivity questions — it returns the same net/pin data in a much more compact format with resolved part names.
Only use this tool when you need a specific netlist export format (Allegro, PADS, etc.) or the full raw netlist data.`,
		withQueryParams({
			type: z
				.enum(['Allegro', 'PADS', 'Protel2', 'JLCEDA', 'EasyEDA', 'DISA'])
				.optional()
				.describe('Netlist format type'),
		}),
		async (params) => {
			const result = await bridge.send('sch.netlist.get', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'sch_get_connectivity',
		`Get compact connectivity data: which nets connect which component pins, with resolved part names.
Much smaller than sch_get_netlist — use this for connectivity questions.
Returns nets (net → pin connections like "U3.2(GND)") and components (designator → part + pin assignments).
Auto-generated net names (starting with $) are hidden from the nets view but shown in component pin assignments.`,
		withDocumentParam({
			designators: z
				.array(z.string())
				.optional()
				.describe('Only include these components and nets touching them (e.g. ["U3", "U8"])'),
			nets: z
				.array(z.string())
				.optional()
				.describe('Only include these nets and components touching them (e.g. ["GND", "VBUS"])'),
		}),
		async (params) => {
			const result = await bridge.send('sch.connectivity.get', params);
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
		async (params) => {
			const result = await bridge.send('sch.drc.check', params);
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
