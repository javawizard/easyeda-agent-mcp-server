import type { ToolDef, ToolContext } from '../types';
import { z } from 'zod';
import { withDocumentParam } from './query-params';

const EXPORT_HANDLER_MAP: Record<string, string> = {
	dsn: 'pcb.manufacture.getDsnFile',
	autoroute_json: 'pcb.manufacture.getAutoRouteJsonFile',
	autolayout_json: 'pcb.manufacture.getAutoLayoutJsonFile',
	gerber: 'pcb.manufacture.getGerberFile',
	bom: 'pcb.manufacture.getBomFile',
	pick_and_place: 'pcb.manufacture.getPickAndPlaceFile',
	'3d': 'pcb.manufacture.get3DFile',
	pdf: 'pcb.manufacture.getPdfFile',
	netlist: 'pcb.manufacture.getNetlistFile',
	dxf: 'pcb.manufacture.getDxfFile',
	altium: 'pcb.manufacture.getAltiumDesignerFile',
	pads: 'pcb.manufacture.getPadsFile',
};

const IMPORT_HANDLER_MAP: Record<string, string> = {
	autoroute_json: 'pcb.manufacture.importAutoRouteJson',
	autolayout_json: 'pcb.manufacture.importAutoLayoutJson',
	autoroute_ses: 'pcb.manufacture.importAutoRouteSes',
};

export function manufactureTools(ctx: ToolContext): ToolDef[] {
	return [
		{
			name: 'pcb_export',
			description: `Export the PCB design in various formats. Returns { fileName, data (Base64), size }.
Formats: dsn (for FreeRouting), gerber (manufacturing), bom (bill of materials), pick_and_place (assembly),
3d (STEP/OBJ), pdf, netlist, dxf, altium, pads, autoroute_json, autolayout_json.
Use fileType for sub-formats: "xlsx"/"csv" (bom, pick_and_place), "step"/"obj" (3d).`,
			inputShape: withDocumentParam({
				format: z
					.enum([
						'dsn', 'autoroute_json', 'autolayout_json', 'gerber', 'bom',
						'pick_and_place', '3d', 'pdf', 'netlist', 'dxf', 'altium', 'pads',
					])
					.describe('Export format'),
				fileName: z.string().optional().describe('Output file name'),
				fileType: z
					.string()
					.optional()
					.describe('Sub-format (e.g. "xlsx"/"csv" for bom, "step"/"obj" for 3d)'),
			}),
			handler: async ({ format, ...rest }) => {
				const result = await ctx.sendToExtension(EXPORT_HANDLER_MAP[format], rest);
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},

		{
			name: 'pcb_import',
			description: `Import routing or layout result files into the PCB (Base64-encoded).
Formats: autoroute_json (JSON autoroute), autolayout_json (JSON autolayout), autoroute_ses (FreeRouting SES).`,
			inputShape: withDocumentParam({
				format: z
					.enum(['autoroute_json', 'autolayout_json', 'autoroute_ses'])
					.describe('Import format'),
				data: z.string().describe('Base64-encoded file content'),
				fileName: z.string().optional().describe('File name'),
			}),
			handler: async ({ format, ...rest }) => {
				const result = await ctx.sendToExtension(IMPORT_HANDLER_MAP[format], rest);
				return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
			},
		},
	];
}
