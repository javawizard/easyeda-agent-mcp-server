import { z } from 'zod';
import type { ToolDef, ToolContext } from '../types';

export function pourFillTools(ctx: ToolContext): ToolDef[] {
	return [
		{
			name: 'pcb_get_all_pours',
			description: 'Get all copper pour regions on the PCB, optionally filtered by net and layer',
			inputShape: {
				net: z.string().optional().describe('Filter by net name'),
				layer: z.string().optional().describe('Filter by layer'),
			},
			handler: async ({ net, layer }) => {
				const result = await ctx.sendToExtension('pcb.getAll.pour', { net, layer });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_create_pour',
			description: 'Create a copper pour region on the PCB. The polygon should be a flat array like ["L", x1, y1, x2, y2, ..., x1, y1] where "L" indicates line segments.',
			inputShape: {
				net: z.string().describe('Net name for the pour'),
				layer: z.string().describe('Layer name (e.g. "TopLayer", "BottomLayer", "InnerLayer1", "InnerLayer2")'),
				polygon: z
					.array(z.union([z.string(), z.number()]))
					.describe('Polygon source array, e.g. ["L", x1, y1, x2, y2, ..., x1, y1]'),
				pourFillMethod: z
					.enum(['solid', '45grid', '90grid'])
					.optional()
					.describe('Fill method: "solid", "45grid", or "90grid"'),
				preserveSilos: z.boolean().optional().describe('Whether to preserve copper islands'),
				pourName: z.string().optional().describe('Name for the pour region'),
				pourPriority: z.number().optional().describe('Pour priority (higher = poured first)'),
				lineWidth: z.number().optional().describe('Line width'),
				primitiveLock: z.boolean().optional().describe('Whether to lock the pour'),
			},
			handler: async (params) => {
				const result = await ctx.sendToExtension('pcb.create.pour', params);
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_delete_pours',
			description: 'Delete copper pour regions by their IDs',
			inputShape: {
				ids: z.array(z.string()).describe('Array of pour primitive IDs to delete'),
			},
			handler: async ({ ids }) => {
				const result = await ctx.sendToExtension('pcb.delete.pour', { ids });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_get_all_fills',
			description: 'Get all fill regions on the PCB, optionally filtered by layer and net',
			inputShape: {
				layer: z.string().optional().describe('Filter by layer'),
				net: z.string().optional().describe('Filter by net name'),
			},
			handler: async ({ layer, net }) => {
				const result = await ctx.sendToExtension('pcb.getAll.fill', { layer, net });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_delete_fills',
			description: 'Delete fill regions by their IDs',
			inputShape: {
				ids: z.array(z.string()).describe('Array of fill primitive IDs to delete'),
			},
			handler: async ({ ids }) => {
				const result = await ctx.sendToExtension('pcb.delete.fill', { ids });
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},
	];
}
