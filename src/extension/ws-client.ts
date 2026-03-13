import { componentHandlers } from './handlers/component';
import { trackHandlers } from './handlers/track';
import { viaHandlers } from './handlers/via';
import { netHandlers } from './handlers/net';
import { drcHandlers } from './handlers/drc';
import { documentHandlers } from './handlers/document';
import { schComponentHandlers } from './handlers/sch-component';
import { schWireHandlers } from './handlers/sch-wire';
import { schDocumentHandlers } from './handlers/sch-document';
import { schSelectHandlers } from './handlers/sch-select';
import { schPrimitiveHandlers } from './handlers/sch-primitive';
import { libraryHandlers } from './handlers/library';
import { pourFillHandlers } from './handlers/pour-fill';
import { manufactureHandlers } from './handlers/manufacture';
import { layerHandlers } from './handlers/layer';
import { pcbPrimitiveHandlers } from './handlers/pcb-primitive';
import { editorHandlers } from './handlers/editor';

const PORT_RANGE_START = 15168;
const PORT_RANGE_SIZE = 20;

// Generate a random 8-character hex instance ID for this tab.
// Stored on globalThis so it survives extension IIFE re-evaluations
// but is unique per browser tab/context.
const GLOBAL_KEY = '__claude_mcp_instance_id__';

function getOrCreateInstanceId(): string {
	const g = globalThis as any;
	if (!g[GLOBAL_KEY]) {
		const bytes = new Uint8Array(4);
		crypto.getRandomValues(bytes);
		g[GLOBAL_KEY] = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
	}
	return g[GLOBAL_KEY];
}

const instanceId = getOrCreateInstanceId();

export function getInstanceId(): string {
	return instanceId;
}

interface QueryParams {
	fields?: string[];
	filter?: Record<string, string | number | boolean | string[]>;
	limit?: number;
}

function matchesFilter(item: any, filter: Record<string, string | number | boolean | string[]>): boolean {
	for (const [key, condition] of Object.entries(filter)) {
		const value = item[key];
		if (Array.isArray(condition)) {
			// OR: item.key must be one of the values
			if (!condition.includes(String(value))) return false;
		} else if (typeof condition === 'string' && condition.endsWith('*')) {
			// Prefix glob: item.key must start with prefix
			const prefix = condition.slice(0, -1);
			if (typeof value !== 'string' || !value.startsWith(prefix)) return false;
		} else {
			// Exact equality
			if (value !== condition) return false;
		}
	}
	return true;
}

function projectFields(item: any, fields: string[]): any {
	const projected: any = {};
	for (const field of fields) {
		if (field in item) {
			projected[field] = item[field];
		}
	}
	return projected;
}

function applyQueryParams(result: any, qp: QueryParams): any {
	if (!qp.fields && !qp.filter && !qp.limit) return result;

	if (!Array.isArray(result)) {
		// Non-array: only fields projection applies
		if (qp.fields && result && typeof result === 'object') {
			return projectFields(result, qp.fields);
		}
		return result;
	}

	let items = result;

	// 1. Filter
	if (qp.filter) {
		items = items.filter((item: any) => matchesFilter(item, qp.filter!));
	}

	// 2. Limit
	if (qp.limit && items.length > qp.limit) {
		items = items.slice(0, qp.limit);
	}

	// 3. Fields projection
	if (qp.fields) {
		const availableFields = items.length > 0 ? Object.keys(items[0]) : [];
		items = items.map((item: any) => projectFields(item, qp.fields!));
		return { items, _availableFields: availableFields };
	}

	return items;
}

function wsIdForPort(port: number): string {
	return `mcp-bridge-${port}`;
}

function wsUrlForPort(port: number): string {
	return `ws://localhost:${port}?instanceId=${instanceId}`;
}

const PORTS_KEY = '__claude_mcp_connected_ports__';
const connectedPorts: Set<number> = (globalThis as any)[PORTS_KEY] || ((globalThis as any)[PORTS_KEY] = new Set<number>());

const allHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	...componentHandlers,
	...trackHandlers,
	...viaHandlers,
	...netHandlers,
	...drcHandlers,
	...documentHandlers,
	...schComponentHandlers,
	...schWireHandlers,
	...schDocumentHandlers,
	...schSelectHandlers,
	...schPrimitiveHandlers,
	...libraryHandlers,
	...pourFillHandlers,
	...manufactureHandlers,
	...layerHandlers,
	...pcbPrimitiveHandlers,
	...editorHandlers,
};

async function getInstanceInfo(): Promise<Record<string, any>> {
	const DOC_TYPE_NAMES: Record<number, string> = { 1: 'schematic', 3: 'pcb' };

	try {
		const [project, currentDoc, tree] = await Promise.all([
			eda.dmt_Project.getCurrentProjectInfo(),
			eda.dmt_SelectControl.getCurrentDocumentInfo(),
			eda.dmt_EditorControl.getSplitScreenTree(),
		]);

		const documents: Array<{ title: string; uuid: string }> = [];
		if (tree) {
			(function collectTabs(node: any): void {
				if (node.tabs) {
					for (const tab of node.tabs) {
						documents.push({ title: tab.title, uuid: tab.tabId });
					}
				}
				if (node.children) {
					for (const child of node.children) {
						collectTabs(child);
					}
				}
			})(tree);
		}

		// Runtime API returns more fields than the type declarations expose
		const proj = project as any;
		const doc = currentDoc as any;

		return {
			instanceId,
			projectName: proj?.name ?? proj?.title,
			currentDocument: doc?.tabId,
			documentType: doc?.documentType != null ? (DOC_TYPE_NAMES[doc.documentType] || `type_${doc.documentType}`) : undefined,
			documents,
		};
	} catch {
		return { instanceId };
	}
}

// Register the instance.getInfo handler alongside other handlers
allHandlers['instance.getInfo'] = async () => getInstanceInfo();

async function requireDocumentType(method: string): Promise<void> {
	const requiresPcb = method.startsWith('pcb.');
	const requiresSch = method.startsWith('sch.');
	if (!requiresPcb && !requiresSch) return;

	const doc = await eda.dmt_SelectControl.getCurrentDocumentInfo();
	const docType = doc?.documentType;

	if (requiresPcb && docType !== 3) {
		const current =
			docType === 1 ? ' (a schematic is currently open)' : docType != null ? '' : ' (no document is open)';
		throw new Error(
			`This tool requires a PCB document, but the currently active tab is not a PCB${current}. Use editor_open_document to switch to a PCB document and try again.`,
		);
	}

	if (requiresSch && docType !== 1) {
		const current =
			docType === 3 ? ' (a PCB is currently open)' : docType != null ? '' : ' (no document is open)';
		throw new Error(
			`This tool requires a schematic document, but the currently active tab is not a schematic${current}. Use editor_open_document to switch to a schematic document and try again.`,
		);
	}
}

function handleMessage(extensionUuid: string, port: number, event: MessageEvent<any>): void {
	let id: string | undefined;
	try {
		const message = typeof event.data === 'string' ? event.data : String(event.data);
		const request = JSON.parse(message);
		id = request.id;
		const method: string = request.method;
		const params: Record<string, any> = request.params || {};

		// Extract query params before dispatching to handler
		const { fields, filter, limit, ...handlerParams } = params;
		const qp: QueryParams = { fields, filter, limit };

		const handler = allHandlers[method];
		if (!handler) {
			sendResponse(extensionUuid, port, id!, undefined, `Unknown method: ${method}. If you recently updated the MCP server, you may need to reinstall the EasyEDA extension as well.`);
			return;
		}

		requireDocumentType(method).then(
			() =>
				handler(handlerParams).then(
					(result) => sendResponse(extensionUuid, port, id!, applyQueryParams(result, qp)),
					(err: any) => {
						const errorMsg = err instanceof Error ? err.message : String(err);
						sendResponse(extensionUuid, port, id!, undefined, errorMsg);
					},
				),
			(err: any) => {
				const errorMsg = err instanceof Error ? err.message : String(err);
				sendResponse(extensionUuid, port, id!, undefined, errorMsg);
			},
		);
	} catch (err: any) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		if (id) {
			sendResponse(extensionUuid, port, id, undefined, errorMsg);
		}
	}
}

function sendResponse(extensionUuid: string, port: number, id: string, result?: any, error?: string): void {
	const response: Record<string, any> = { id };
	if (error) {
		response.error = error;
	} else {
		response.result = result;
	}
	try {
		eda.sys_WebSocket.send(wsIdForPort(port), JSON.stringify(response), extensionUuid);
	} catch {
		// Send failed — connection is dead, remove from tracked ports
		connectedPorts.delete(port);
	}
}

function sendNotification(extensionUuid: string, port: number, type: string, data: any): void {
	try {
		eda.sys_WebSocket.send(wsIdForPort(port), JSON.stringify({ type, data }), extensionUuid);
	} catch {
		connectedPorts.delete(port);
	}
}

/**
 * Push updated instance info to all connected MCP servers.
 * Called when the active document changes, etc.
 */
async function pushInstanceInfoToAll(extensionUuid: string): Promise<void> {
	const info = await getInstanceInfo();
	for (const port of connectedPorts) {
		sendNotification(extensionUuid, port, 'instanceInfo', info);
	}
}

let pendingConnectionPorts: number[] = [];
let connectionToastTimer: ReturnType<typeof setTimeout> | null = null;

function flushConnectionToast(): void {
	if (pendingConnectionPorts.length === 0) return;
	const ports = pendingConnectionPorts;
	pendingConnectionPorts = [];
	connectionToastTimer = null;
	const portList = ports.map(String).join(', ');
	const msg =
		ports.length === 1
			? `Connected to Claude MCP Server on port ${portList} (instance: ${instanceId})`
			: `Connected to ${ports.length} Claude MCP Servers on ports ${portList} (instance: ${instanceId})`;
	eda.sys_Message.showToastMessage(msg, ESYS_ToastMessageType.SUCCESS, 5);
}

let noNewServersTimer: ReturnType<typeof setTimeout> | null = null;

export function connectToMcpServers(extensionUuid: string): void {
	const countBefore = connectedPorts.size;

	for (let i = 0; i < PORT_RANGE_SIZE; i++) {
		const port = PORT_RANGE_START + i;
		if (connectedPorts.has(port)) {
			continue;
		}
		const wsId = wsIdForPort(port);
		const wsUrl = wsUrlForPort(port);
		eda.sys_WebSocket.register(
			wsId,
			wsUrl,
			(event: MessageEvent<any>) => handleMessage(extensionUuid, port, event),
			() => {
				connectedPorts.add(port);
				pendingConnectionPorts.push(port);
				if (connectionToastTimer !== null) {
					clearTimeout(connectionToastTimer);
				}
				connectionToastTimer = setTimeout(flushConnectionToast, 500);

				// Cancel the "no new servers" toast since we found one
				if (noNewServersTimer !== null) {
					clearTimeout(noNewServersTimer);
					noNewServersTimer = null;
				}

				// Push instance info to the newly connected server after a short delay
				// (give the server a moment to finish its connection setup)
				setTimeout(() => pushInstanceInfoToAll(extensionUuid), 200);
			},
		);
	}

	// If no new connections arrive within 2s, show a "no new servers" toast
	if (countBefore > 0) {
		if (noNewServersTimer !== null) {
			clearTimeout(noNewServersTimer);
		}
		noNewServersTimer = setTimeout(() => {
			noNewServersTimer = null;
			if (connectedPorts.size === countBefore) {
				eda.sys_Message.showToastMessage(
					`No new servers found (${countBefore} already connected)`,
					ESYS_ToastMessageType.INFO,
					3,
				);
			}
		}, 2000);
	}
}

export function disconnectFromAllMcpServers(extensionUuid: string): void {
	for (const port of connectedPorts) {
		try {
			eda.sys_WebSocket.close(wsIdForPort(port), undefined, undefined, extensionUuid);
		} catch {
			// Ignore close errors
		}
	}
	connectedPorts.clear();
}

export function getConnectedPortCount(): number {
	return connectedPorts.size;
}

export function getConnectedPorts(): number[] {
	return [...connectedPorts];
}
