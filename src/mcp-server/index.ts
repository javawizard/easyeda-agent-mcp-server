import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { resolve as resolvePath } from 'node:path';
import { WebSocketBridge } from './bridge';
import { registerReadTools } from './tools/read-tools';
import { registerWriteTools } from './tools/write-tools';
import { registerAnalysisTools } from './tools/analysis-tools';
import { registerSchReadTools } from './tools/sch-read-tools';
import { registerSchWriteTools } from './tools/sch-write-tools';
import { registerLibTools } from './tools/lib-tools';
import { registerManufactureTools } from './tools/manufacture-tools';
import { registerPcbDrcTools } from './tools/pcb-drc-tools';
import { registerPcbLayerTools } from './tools/pcb-layer-tools';
import { registerEditorTools } from './tools/editor-tools';
import { registerFileManagerTools } from './tools/file-manager-tools';
import { registerSchemaTools } from './tools/schema-tools';

const PORT_RANGE_START = Number(process.env.EDA_WS_PORT) || 15168;
const PORT_RANGE_SIZE = Number(process.env.EDA_WS_PORT_RANGE) || 40;

/**
 * Build the MCP server's `instructions` field — the block of context every
 * client loads up front. This is the only documentation that reaches agents
 * in unrelated repos, so it has to cover:
 *   1. What the server is for and how to discover designs
 *   2. The download → edit → upload workflow for non-trivial edits
 *   3. Where the editing library + schema live (with absolute paths so agents
 *      in a foreign cwd can still find them)
 *   4. What to do when validation surfaces unknown tags (extend the schema)
 * Tight is better than comprehensive — agents can read the tool descriptions
 * and the repo's own docs for detail.
 */
function buildInstructions(repoRoot: string): string {
	return [
		'This server provides direct access to schematic and PCB designs in EasyEDA Pro.',
		'When the user asks about their circuit designs, schematics, PCB layouts, components, footprints, or netlist connections, check this server in addition to (or instead of) searching the filesystem for design files.',
		'Start with `server_info` to check connectivity, then use `editor_get_open_tabs` or `project_get_structure` to discover what designs are available.',
		'',
		`This MCP server's source lives at ${repoRoot}. The editing library, schema, examples, and tests are all under that path; consult them when the tool descriptions aren't enough.`,
		'',
		'EDIT WORKFLOW — use this for anything beyond a single primitive change:',
		`  1. Pull the source: \`document_save_to_file\` (one document) or \`project_export_file\` (whole project as .epro ZIP of NDJSON).`,
		`  2. Edit the raw source on disk. For schematic edits, use the library at ${repoRoot}/src/lib/ (README at ${repoRoot}/src/lib/README.md, runnable examples at ${repoRoot}/examples/). It exposes a typed SchematicWriter that handles element IDs, unique IDs, junction wires, designator allocation, and maxId bookkeeping. Write a throwaway ts-node script rather than issuing many per-primitive MCP calls — it is orders of magnitude faster.`,
		`  3. Push the result back: \`document_load_from_file\` or \`project_import_file\`. Every destructive upload is auto-backed up to a git repo (default \`~/.easyeda-mcp-backup\`, override with EDA_BACKUP_DIR); the response returns a backup SHA you can reference if the edit goes wrong.`,
		'',
		'VALIDATION: uploads default to validate=\'strict\' (any unknown or malformed line aborts the upload). Downloads run in warn mode and attach a validation report.',
		`If a download or upload surfaces \`unknown-tag\` samples, this server's Zod schema is missing coverage for a shape EasyEDA actually emits. To extend it: read an existing per-line schema under ${repoRoot}/src/lib/schema/line-*.ts as precedent, add a new Line schema for the tag (or extend an existing one), wire it into the matching doc-type union + schemaMap in esch.ts / esym.ts / epcb.ts / eins.ts, and run \`npm test\` (from ${repoRoot}). The unknown-tag samples in the validation report include the tag name, tuple length, and a sample row — enough to start. When in doubt survey real files the same way ${repoRoot}/src/lib/schema/line-pcb.ts was derived.`,
	].join('\n');
}

async function main() {
	const bridge = await WebSocketBridge.startOnAvailablePort(PORT_RANGE_START, PORT_RANGE_SIZE);

	// Self-locate the repo root so the instructions can tell agents exactly
	// where the editing library, schema, and examples live — regardless of
	// which directory the user's conversation is in. Works for both dev
	// (`ts-node src/mcp-server/index.ts`) and prod (`node dist/mcp-server/index.js`):
	// from either, walking two levels up lands at the repo root.
	const REPO_ROOT = resolvePath(__dirname, '..', '..');

	const server = new McpServer(
		{
			name: 'easyeda-agent-mcp-server',
			version: '1.0.0',
		},
		{
			instructions: buildInstructions(REPO_ROOT),
		},
	);

	server.tool(
		'server_info',
		'Get MCP server status: WebSocket port, connection state, connected instances, and allowed origins',
		{},
		async () => {
			const instances = bridge.getConnectedInstances();
			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({
						wsPort: bridge.getPort(),
						extensionConnected: bridge.isConnected(),
						connectedInstanceCount: instances.length,
						instances: instances.map((info) => ({
							instanceId: info.instanceId,
							projectName: info.projectName,
							currentDocument: info.currentDocument,
							documentType: info.documentType,
						})),
						allowAllOrigins: process.env.EDA_WS_ALLOW_ALL_ORIGINS === '1',
					}, null, 2),
				}],
			};
		},
	);

	server.tool(
		'list_instances',
		'List all connected EasyEDA Pro instances with their current state (project, active document, open tabs). Use this to find the instance_id you need for other tools when multiple instances are connected.',
		{},
		async () => {
			await bridge.refreshAllInstanceInfo();
			const instances = bridge.getConnectedInstances();

			if (instances.length === 0) {
				return {
					content: [{
						type: 'text' as const,
						text: 'No EasyEDA Pro instances are connected. Please open EasyEDA Pro and click "Connect Claude" in the Claude menu.',
					}],
				};
			}

			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({
						connectedInstanceCount: instances.length,
						instances: instances.map((info) => ({
							instanceId: info.instanceId,
							projectName: info.projectName,
							currentDocument: info.currentDocument,
							documentType: info.documentType,
							documents: info.documents,
							connectedAt: new Date(info.connectedAt).toISOString(),
						})),
						note: instances.length === 1
							? 'Only one instance connected — instance_id can be omitted from tool calls (auto-selected).'
							: 'Multiple instances connected — pass instance_id to tool calls to target a specific instance.',
					}, null, 2),
				}],
			};
		},
	);

	registerReadTools(server, bridge);
	registerWriteTools(server, bridge);
	registerAnalysisTools(server, bridge);
	registerSchReadTools(server, bridge);
	registerSchWriteTools(server, bridge);
	registerLibTools(server, bridge);
	registerManufactureTools(server, bridge);
	registerPcbDrcTools(server, bridge);
	registerPcbLayerTools(server, bridge);
	registerEditorTools(server, bridge);
	registerFileManagerTools(server, bridge);
	registerSchemaTools(server, bridge);

	const transport = new StdioServerTransport();
	await server.connect(transport);

	console.error('[MCP] EasyEDA Agent MCP Server started');
	console.error(`[MCP] WebSocket Server on port ${bridge.getPort()}, waiting for EDA Pro Extension...`);

	// Notify any peer MCP servers so their connected extensions discover us immediately
	bridge.notifyPeers(PORT_RANGE_START, PORT_RANGE_SIZE);

	process.on('SIGINT', async () => {
		await bridge.stop();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		await bridge.stop();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error('[MCP] Fatal error:', err);
	process.exit(1);
});
