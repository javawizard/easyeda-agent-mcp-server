import { z } from 'zod';
import type { ToolDef, ToolContext } from '../types';

export function pcbPrimitiveTools(ctx: ToolContext): ToolDef[] {
	return [
		// === Via Modify ===

		{
			name: 'pcb_modify_via',
			description: 'Modify properties of an existing via',
			inputShape: {
				primitiveId: z.string().describe('The via primitive ID'),
				net: z.string().optional().describe('New net name'),
				x: z.number().optional().describe('New X coordinate'),
				y: z.number().optional().describe('New Y coordinate'),
				holeDiameter: z.number().optional().describe('New hole diameter'),
				diameter: z.number().optional().describe('New via pad diameter'),
				viaType: z.string().optional().describe('New via type'),
				primitiveLock: z.boolean().optional().describe('Lock status'),
			},
			handler: async ({ primitiveId, ...property }) => {
				const result = await ctx.sendToExtension('pcb.modify.via', { primitiveId, property });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Polyline Modify ===

		{
			name: 'pcb_modify_polyline_track',
			description: 'Modify properties of an existing polyline track',
			inputShape: {
				primitiveId: z.string().describe('The polyline primitive ID'),
				net: z.string().optional().describe('New net name'),
				layer: z.string().optional().describe('New layer'),
				lineWidth: z.number().optional().describe('New track width'),
				primitiveLock: z.boolean().optional().describe('Lock status'),
			},
			handler: async ({ primitiveId, ...property }) => {
				const result = await ctx.sendToExtension('pcb.modify.polyline', { primitiveId, property });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Component Delete ===

		{
			name: 'pcb_delete_component',
			description: 'Delete one or more PCB components by their primitive IDs',
			inputShape: {
				ids: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs to delete'),
			},
			handler: async ({ ids }) => {
				const result = await ctx.sendToExtension('pcb.delete.component', { ids });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Pad CRUD ===

		{
			name: 'pcb_create_pad',
			description: 'Create a standalone pad on the PCB',
			inputShape: {
				layer: z.string().describe('Pad layer'),
				padNumber: z.string().describe('Pad number/name'),
				x: z.number().describe('X coordinate'),
				y: z.number().describe('Y coordinate'),
				rotation: z.number().optional().describe('Rotation angle in degrees'),
				net: z.string().optional().describe('Net name'),
				primitiveLock: z.boolean().optional().describe('Whether to lock'),
			},
			handler: async (params) => {
				const result = await ctx.sendToExtension('pcb.create.pad', params);
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_modify_pad',
			description: 'Modify properties of an existing pad',
			inputShape: {
				primitiveId: z.string().describe('The pad primitive ID'),
				x: z.number().optional().describe('New X coordinate'),
				y: z.number().optional().describe('New Y coordinate'),
				rotation: z.number().optional().describe('New rotation'),
				net: z.string().optional().describe('New net name'),
				padNumber: z.string().optional().describe('New pad number'),
				layer: z.string().optional().describe('New layer'),
				primitiveLock: z.boolean().optional().describe('Lock status'),
			},
			handler: async ({ primitiveId, ...property }) => {
				const result = await ctx.sendToExtension('pcb.modify.pad', { primitiveId, property });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_delete_pads',
			description: 'Delete one or more pads by their primitive IDs',
			inputShape: {
				ids: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs to delete'),
			},
			handler: async ({ ids }) => {
				const result = await ctx.sendToExtension('pcb.delete.pad', { ids });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Arc CRUD ===

		{
			name: 'pcb_get_all_arcs',
			description: 'Get all arc segments on the PCB, optionally filtered by net and layer',
			inputShape: {
				net: z.string().optional().describe('Filter by net name'),
				layer: z.string().optional().describe('Filter by layer'),
			},
			handler: async ({ net, layer }) => {
				const result = await ctx.sendToExtension('pcb.getAll.arc', { net, layer });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_create_arc',
			description: 'Create an arc track segment on the PCB',
			inputShape: {
				net: z.string().describe('Net name'),
				layer: z.string().describe('Layer name'),
				startX: z.number().describe('Start X coordinate'),
				startY: z.number().describe('Start Y coordinate'),
				endX: z.number().describe('End X coordinate'),
				endY: z.number().describe('End Y coordinate'),
				arcAngle: z.number().describe('Arc angle in degrees'),
				lineWidth: z.number().optional().describe('Track width'),
				primitiveLock: z.boolean().optional().describe('Whether to lock'),
			},
			handler: async (params) => {
				const result = await ctx.sendToExtension('pcb.create.arc', params);
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_modify_arc',
			description: 'Modify properties of an existing arc segment',
			inputShape: {
				primitiveId: z.string().describe('The arc primitive ID'),
				net: z.string().optional().describe('New net name'),
				layer: z.string().optional().describe('New layer'),
				startX: z.number().optional().describe('New start X'),
				startY: z.number().optional().describe('New start Y'),
				endX: z.number().optional().describe('New end X'),
				endY: z.number().optional().describe('New end Y'),
				arcAngle: z.number().optional().describe('New arc angle'),
				lineWidth: z.number().optional().describe('New track width'),
				primitiveLock: z.boolean().optional().describe('Lock status'),
			},
			handler: async ({ primitiveId, ...property }) => {
				const result = await ctx.sendToExtension('pcb.modify.arc', { primitiveId, property });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_delete_arcs',
			description: 'Delete one or more arc segments by their primitive IDs',
			inputShape: {
				ids: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs to delete'),
			},
			handler: async ({ ids }) => {
				const result = await ctx.sendToExtension('pcb.delete.arc', { ids });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Region CRUD ===

		{
			name: 'pcb_get_all_regions',
			description: 'Get all design rule regions on the PCB, optionally filtered by layer and rule type',
			inputShape: {
				layer: z.string().optional().describe('Filter by layer'),
				ruleType: z.array(z.string()).optional().describe('Filter by rule type(s)'),
			},
			handler: async ({ layer, ruleType }) => {
				const result = await ctx.sendToExtension('pcb.getAll.region', { layer, ruleType });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_create_region',
			description: 'Create a design rule region (keepout/constraint area) on the PCB',
			inputShape: {
				layer: z.string().describe('Layer name'),
				polygon: z
					.array(z.union([z.string(), z.number()]))
					.describe('Polygon source array, e.g. ["L", x1, y1, x2, y2, ..., x1, y1]'),
				ruleType: z.array(z.string()).optional().describe('Rule type(s) for the region'),
				regionName: z.string().optional().describe('Name for the region'),
				lineWidth: z.number().optional().describe('Outline width'),
				primitiveLock: z.boolean().optional().describe('Whether to lock'),
			},
			handler: async (params) => {
				const result = await ctx.sendToExtension('pcb.create.region', params);
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_modify_region',
			description: 'Modify properties of an existing design rule region',
			inputShape: {
				primitiveId: z.string().describe('The region primitive ID'),
				layer: z.string().optional().describe('New layer'),
				ruleType: z.array(z.string()).optional().describe('New rule type(s)'),
				regionName: z.string().optional().describe('New region name'),
				lineWidth: z.number().optional().describe('New outline width'),
				primitiveLock: z.boolean().optional().describe('Lock status'),
			},
			handler: async ({ primitiveId, ...property }) => {
				const result = await ctx.sendToExtension('pcb.modify.region', { primitiveId, property });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_delete_regions',
			description: 'Delete one or more design rule regions by their primitive IDs',
			inputShape: {
				ids: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs to delete'),
			},
			handler: async ({ ids }) => {
				const result = await ctx.sendToExtension('pcb.delete.region', { ids });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Fill Create / Modify (Pour already has create in pour-fill-tools) ===

		{
			name: 'pcb_create_fill',
			description: 'Create a fill region on the PCB',
			inputShape: {
				layer: z.string().describe('Layer name'),
				polygon: z
					.array(z.union([z.string(), z.number()]))
					.describe('Polygon source array, e.g. ["L", x1, y1, x2, y2, ..., x1, y1]'),
				net: z.string().optional().describe('Net name'),
				fillMode: z.string().optional().describe('Fill mode'),
				lineWidth: z.number().optional().describe('Line width'),
				primitiveLock: z.boolean().optional().describe('Whether to lock'),
			},
			handler: async (params) => {
				const result = await ctx.sendToExtension('pcb.create.fill', params);
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_modify_fill',
			description: 'Modify properties of an existing fill region',
			inputShape: {
				primitiveId: z.string().describe('The fill primitive ID'),
				layer: z.string().optional().describe('New layer'),
				net: z.string().optional().describe('New net'),
				fillMode: z.string().optional().describe('New fill mode'),
				lineWidth: z.number().optional().describe('New line width'),
				primitiveLock: z.boolean().optional().describe('Lock status'),
			},
			handler: async ({ primitiveId, ...property }) => {
				const result = await ctx.sendToExtension('pcb.modify.fill', { primitiveId, property });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_modify_pour',
			description: 'Modify properties of an existing copper pour',
			inputShape: {
				primitiveId: z.string().describe('The pour primitive ID'),
				net: z.string().optional().describe('New net'),
				layer: z.string().optional().describe('New layer'),
				pourFillMethod: z
					.enum(['solid', '45grid', '90grid'])
					.optional()
					.describe('Fill method'),
				preserveSilos: z.boolean().optional().describe('Preserve copper islands'),
				pourName: z.string().optional().describe('Pour name'),
				pourPriority: z.number().optional().describe('Pour priority'),
				lineWidth: z.number().optional().describe('Line width'),
				primitiveLock: z.boolean().optional().describe('Lock status'),
			},
			handler: async ({ primitiveId, ...property }) => {
				const result = await ctx.sendToExtension('pcb.modify.pour', { primitiveId, property });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},
	];
}
