import { z } from 'zod';
import type { ToolDef, ToolContext } from '../types';

export function pcbDocumentTools(ctx: ToolContext): ToolDef[] {
	return [
		// === Navigation ===

		{
			name: 'pcb_navigate_to_region',
			description: 'Navigate and zoom the PCB editor viewport to fit a specific region',
			inputShape: {
				left: z.number().describe('Left boundary X'),
				right: z.number().describe('Right boundary X'),
				top: z.number().describe('Top boundary Y'),
				bottom: z.number().describe('Bottom boundary Y'),
			},
			handler: async ({ left, right, top, bottom }) => {
				const result = await ctx.sendToExtension('pcb.document.navigateToRegion', { left, right, top, bottom });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_zoom_to_board',
			description: 'Zoom the viewport to fit the entire board outline',
			inputShape: {},
			handler: async () => {
				const result = await ctx.sendToExtension('pcb.document.zoomToBoardOutline');
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Primitive Query ===

		{
			name: 'pcb_get_primitive_at_point',
			description: 'Get the primitive at a specific point on the PCB',
			inputShape: {
				x: z.number().describe('X coordinate'),
				y: z.number().describe('Y coordinate'),
			},
			handler: async ({ x, y }) => {
				const result = await ctx.sendToExtension('pcb.document.getPrimitiveAtPoint', { x, y });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_primitives_in_region',
			description: 'Get all primitives within a rectangular region on the PCB',
			inputShape: {
				left: z.number().describe('Left boundary X'),
				right: z.number().describe('Right boundary X'),
				top: z.number().describe('Top boundary Y'),
				bottom: z.number().describe('Bottom boundary Y'),
				leftToRight: z
					.boolean()
					.optional()
					.describe('Selection mode: true=must be fully inside, false=intersecting also counts'),
			},
			handler: async ({ left, right, top, bottom, leftToRight }) => {
				const result = await ctx.sendToExtension('pcb.document.getPrimitivesInRegion', {
					left,
					right,
					top,
					bottom,
					leftToRight,
				});
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Coordinate System ===

		{
			name: 'pcb_get_canvas_origin',
			description: 'Get the canvas origin offset relative to data origin',
			inputShape: {},
			handler: async () => {
				const result = await ctx.sendToExtension('pcb.document.getCanvasOrigin');
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_set_canvas_origin',
			description: 'Set the canvas origin offset relative to data origin',
			inputShape: {
				offsetX: z.number().describe('X offset of canvas origin from data origin'),
				offsetY: z.number().describe('Y offset of canvas origin from data origin'),
			},
			handler: async ({ offsetX, offsetY }) => {
				const result = await ctx.sendToExtension('pcb.document.setCanvasOrigin', { offsetX, offsetY });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_convert_canvas_to_data',
			description: 'Convert canvas coordinates to data coordinates',
			inputShape: {
				x: z.number().describe('Canvas X coordinate'),
				y: z.number().describe('Canvas Y coordinate'),
			},
			handler: async ({ x, y }) => {
				const result = await ctx.sendToExtension('pcb.document.convertCanvasToData', { x, y });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_convert_data_to_canvas',
			description: 'Convert data coordinates to canvas coordinates',
			inputShape: {
				x: z.number().describe('Data X coordinate'),
				y: z.number().describe('Data Y coordinate'),
			},
			handler: async ({ x, y }) => {
				const result = await ctx.sendToExtension('pcb.document.convertDataToCanvas', { x, y });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Import ===

		{
			name: 'pcb_import_changes',
			description: 'Import changes from schematic into the PCB (sync schematic to PCB)',
			inputShape: {
				uuid: z.string().optional().describe('Schematic UUID (uses associated schematic if not provided)'),
			},
			handler: async ({ uuid }) => {
				const result = await ctx.sendToExtension('pcb.document.importChanges', { uuid });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		// === Get by ID (all primitive types) ===

		{
			name: 'pcb_get_components',
			description: 'Get one or more PCB components by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.component', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_tracks',
			description: 'Get one or more track segments (lines) by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.line', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_polyline_tracks',
			description: 'Get one or more polyline tracks by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.polyline', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_vias',
			description: 'Get one or more vias by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.via', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_pads',
			description: 'Get one or more pads by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.pad', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_pours',
			description: 'Get one or more copper pours by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.pour', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_fills',
			description: 'Get one or more fill regions by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.fill', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_arcs',
			description: 'Get one or more arc segments by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.arc', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_regions',
			description: 'Get one or more design rule regions by primitive ID(s)',
			inputShape: {
				primitiveIds: z
					.union([z.string(), z.array(z.string())])
					.describe('Single primitive ID or array of IDs'),
			},
			handler: async ({ primitiveIds }) => {
				const result = await ctx.sendToExtension('pcb.get.region', { primitiveIds });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},
	];
}
