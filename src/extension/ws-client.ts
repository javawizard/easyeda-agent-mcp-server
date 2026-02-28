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
	return `ws://localhost:${port}`;
}

const connectedPorts = new Set<number>();

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

		handler(handlerParams).then(
			(result) => sendResponse(extensionUuid, port, id!, applyQueryParams(result, qp)),
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

export function connectToMcpServers(extensionUuid: string): void {
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
				eda.sys_Message.showToastMessage(
					`Connected to Claude MCP Server on port ${port}`,
					ESYS_ToastMessageType.SUCCESS,
					5,
				);
			},
		);
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
