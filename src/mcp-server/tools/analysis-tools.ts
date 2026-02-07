import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WebSocketBridge } from '../bridge';

export function registerAnalysisTools(server: McpServer, bridge: WebSocketBridge): void {
	server.tool(
		'pcb_highlight_net',
		'Highlight a specific net in the PCB editor for visual inspection',
		{
			net: z.string().describe('Net name to highlight'),
		},
		async ({ net }) => {
			const result = await bridge.send('pcb.net.highlight', { net });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_select_net',
		'Select all primitives of a specific net in the PCB editor',
		{
			net: z.string().describe('Net name to select'),
		},
		async ({ net }) => {
			const result = await bridge.send('pcb.net.select', { net });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_navigate_to',
		'Navigate the PCB editor viewport to specific coordinates',
		{
			x: z.number().describe('X coordinate to navigate to'),
			y: z.number().describe('Y coordinate to navigate to'),
		},
		async ({ x, y }) => {
			const result = await bridge.send('pcb.document.navigateTo', { x, y });
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_diff_pairs',
		'Get all differential pair definitions in the PCB design',
		{},
		async () => {
			const result = await bridge.send('pcb.drc.getDiffPairs');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);

	server.tool(
		'pcb_get_equal_length_groups',
		'Get all equal-length net group definitions in the PCB design',
		{},
		async () => {
			const result = await bridge.send('pcb.drc.getEqualLengthGroups');
			return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
		},
	);
}
