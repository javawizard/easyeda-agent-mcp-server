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

		const handler = allHandlers[method];
		if (!handler) {
			sendResponse(extensionUuid, port, id!, undefined, `Unknown method: ${method}. If you recently updated the MCP server, you may need to reinstall the EasyEDA extension as well.`);
			return;
		}

		handler(params).then(
			(result) => sendResponse(extensionUuid, port, id!, result),
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
