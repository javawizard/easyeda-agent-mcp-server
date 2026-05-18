/**
 * Thin UDS client used by the MCP server proxy.
 *
 * Talks the daemon's NDJSON protocol: list_tools / call_tool. Auto-reconnects
 * (and respawns the daemon if needed) when the connection drops.
 *
 * The MCP server consumer is responsible for re-listing tools and updating
 * its registration after a reconnect; this client just exposes:
 *   - listTools(): fetch the daemon's current tool descriptors
 *   - callTool(name, args): forward a tool call
 *   - onReconnected(cb): callback fired after a transparent reconnect
 */
import { createConnection, type Socket } from 'node:net';
import { ensureDaemonRunning } from '../bridge-daemon/spawn';
import {
	socketPath,
	type ClientToDaemon,
	type DaemonToClient,
	type ToolDescriptor,
	type CallToolResult,
} from '../bridge-daemon/protocol';

const REQUEST_TIMEOUT_MS = 45000;

interface PendingListTools {
	resolve: (tools: ToolDescriptor[]) => void;
	reject: (err: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface PendingCallTool {
	resolve: (result: CallToolResult) => void;
	reject: (err: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export class ProxyClient {
	private sock: Socket | null = null;
	private buffer = '';
	private requestIdCounter = 0;
	private pendingList = new Map<string, PendingListTools>();
	private pendingCall = new Map<string, PendingCallTool>();
	private connected = false;
	private connectPromise: Promise<void> | null = null;
	private reconnectListeners = new Set<() => void>();
	private stopped = false;
	private reconnectAttempt = 0;

	async connect(): Promise<void> {
		if (this.connected) return;
		if (this.connectPromise) return this.connectPromise;
		this.connectPromise = (async () => {
			await ensureDaemonRunning();
			await this.openSocket();
		})();
		try {
			await this.connectPromise;
		} finally {
			this.connectPromise = null;
		}
	}

	private openSocket(): Promise<void> {
		return new Promise((resolve, reject) => {
			const sock = createConnection(socketPath());
			sock.setEncoding('utf8');

			const onError = (err: Error) => {
				sock.removeListener('connect', onConnect);
				reject(err);
			};
			const onConnect = () => {
				sock.removeListener('error', onError);
				this.sock = sock;
				this.connected = true;
				sock.on('data', (chunk: string) => this.handleData(chunk));
				sock.on('close', () => this.handleDisconnect());
				sock.on('error', (err) => {
					console.error('[proxy-client] socket error:', err);
				});
				resolve();
			};

			sock.once('error', onError);
			sock.once('connect', onConnect);
		});
	}

	private handleDisconnect(): void {
		this.connected = false;
		this.sock = null;
		this.buffer = '';
		const err = new Error('Bridge daemon disconnected');
		for (const [id, p] of this.pendingList) {
			clearTimeout(p.timer);
			p.reject(err);
			this.pendingList.delete(id);
		}
		for (const [id, p] of this.pendingCall) {
			clearTimeout(p.timer);
			p.reject(err);
			this.pendingCall.delete(id);
		}
		// Proactively reconnect (respawning the daemon if needed). The MCP SDK
		// serves tools/list from its own registration cache, so reconnect-on-
		// next-callTool isn't enough — we need to refresh the registration as
		// soon as the daemon comes back so list_changed actually fires.
		if (!this.stopped) {
			this.scheduleReconnect();
		}
	}

	private scheduleReconnect(): void {
		// Cadence: try fast (the new daemon may already be coming up), then back off.
		const delays = [100, 250, 500, 1000, 2000, 5000];
		const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
		this.reconnectAttempt++;
		setTimeout(async () => {
			if (this.stopped || this.connected) return;
			try {
				await this.connect();
				this.reconnectAttempt = 0;
				for (const cb of this.reconnectListeners) cb();
			} catch (err) {
				console.error(`[proxy-client] reconnect attempt ${this.reconnectAttempt} failed:`, err);
				if (!this.connected && !this.stopped) this.scheduleReconnect();
			}
		}, delay);
	}

	private handleData(chunk: string): void {
		this.buffer += chunk;
		let nl: number;
		while ((nl = this.buffer.indexOf('\n')) !== -1) {
			const line = this.buffer.slice(0, nl);
			this.buffer = this.buffer.slice(nl + 1);
			if (line.length > 0) this.handleMessage(line);
		}
	}

	private handleMessage(raw: string): void {
		let msg: DaemonToClient;
		try {
			msg = JSON.parse(raw) as DaemonToClient;
		} catch (err) {
			console.error('[proxy-client] bad NDJSON:', err);
			return;
		}

		switch (msg.kind) {
			case 'list_tools_result': {
				const p = this.pendingList.get(msg.id);
				if (!p) return;
				clearTimeout(p.timer);
				this.pendingList.delete(msg.id);
				p.resolve(msg.tools);
				return;
			}
			case 'call_tool_result': {
				const p = this.pendingCall.get(msg.id);
				if (!p) return;
				clearTimeout(p.timer);
				this.pendingCall.delete(msg.id);
				if (msg.error !== undefined) p.reject(new Error(msg.error));
				else if (msg.result !== undefined) p.resolve(msg.result);
				else p.reject(new Error('Tool returned no result'));
				return;
			}
			default: {
				const _exhaustive: never = msg;
				console.error('[proxy-client] unknown message kind:', _exhaustive);
			}
		}
	}

	private sendMessage(msg: ClientToDaemon): void {
		if (!this.sock || !this.connected) {
			throw new Error('Bridge daemon not connected');
		}
		this.sock.write(JSON.stringify(msg) + '\n');
	}

	/**
	 * Fetch the daemon's current tool descriptors. Auto-reconnects+respawns on
	 * disconnect.
	 */
	async listTools(): Promise<ToolDescriptor[]> {
		try {
			return await this.listToolsOnce();
		} catch (err: any) {
			if (this.isDisconnectError(err)) {
				await this.connect();
				for (const cb of this.reconnectListeners) cb();
				return this.listToolsOnce();
			}
			throw err;
		}
	}

	private listToolsOnce(): Promise<ToolDescriptor[]> {
		const id = `l${++this.requestIdCounter}`;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingList.delete(id);
				reject(new Error('list_tools timed out'));
			}, REQUEST_TIMEOUT_MS);
			this.pendingList.set(id, { resolve, reject, timer });
			try {
				this.sendMessage({ kind: 'list_tools', id });
			} catch (err) {
				clearTimeout(timer);
				this.pendingList.delete(id);
				reject(err as Error);
			}
		});
	}

	/**
	 * Forward a tool call. Auto-reconnects+respawns on disconnect (single retry).
	 */
	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		try {
			return await this.callToolOnce(name, args);
		} catch (err: any) {
			if (this.isDisconnectError(err)) {
				await this.connect();
				for (const cb of this.reconnectListeners) cb();
				return this.callToolOnce(name, args);
			}
			throw err;
		}
	}

	private callToolOnce(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		const id = `c${++this.requestIdCounter}`;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingCall.delete(id);
				reject(new Error(`call_tool timed out: ${name}`));
			}, REQUEST_TIMEOUT_MS);
			this.pendingCall.set(id, { resolve, reject, timer });
			try {
				this.sendMessage({ kind: 'call_tool', id, name, arguments: args });
			} catch (err) {
				clearTimeout(timer);
				this.pendingCall.delete(id);
				reject(err as Error);
			}
		});
	}

	private isDisconnectError(err: unknown): boolean {
		const msg = err instanceof Error ? err.message : String(err);
		return msg.includes('Bridge daemon disconnected') || msg.includes('not connected');
	}

	/** Register a callback fired after the proxy reconnects to a new daemon. */
	onReconnected(cb: () => void): () => void {
		this.reconnectListeners.add(cb);
		return () => { this.reconnectListeners.delete(cb); };
	}

	async stop(): Promise<void> {
		this.stopped = true;
		if (this.sock) {
			try { this.sock.destroy(); } catch { /* noop */ }
			this.sock = null;
		}
		this.connected = false;
	}
}
