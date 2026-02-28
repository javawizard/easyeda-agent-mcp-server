import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

const ALLOWED_ORIGIN_PATTERNS = [
	/^https?:\/\/([a-z0-9-]+\.)*easyeda\.com(:\d+)?$/,
	/^https?:\/\/([a-z0-9-]+\.)*lceda\.cn(:\d+)?$/,
];

function isAllowedOrigin(origin: string | undefined): boolean {
	if (!origin) return false;
	if (process.env.EDA_WS_ALLOW_ALL_ORIGINS === '1') return true;
	return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

export interface BridgeRequest {
	id: string;
	method: string;
	params: Record<string, unknown>;
}

export interface BridgeResponse {
	id: string;
	result?: unknown;
	error?: string;
}

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export class WebSocketBridge {
	private wss: WebSocketServer | null = null;
	private client: WebSocket | null = null;
	private pendingRequests = new Map<string, PendingRequest>();
	private requestIdCounter = 0;
	private readonly timeout: number;

	constructor(private readonly port: number = 15168, timeout = 30000) {
		this.timeout = timeout;
	}

	getPort(): number {
		return this.port;
	}

	static async startOnAvailablePort(
		portStart: number,
		portCount: number,
		timeout?: number,
	): Promise<WebSocketBridge> {
		for (let i = 0; i < portCount; i++) {
			const port = portStart + i;
			const bridge = new WebSocketBridge(port, timeout);
			try {
				await bridge.start();
				return bridge;
			} catch (err: any) {
				if (err?.code === 'EADDRINUSE') {
					console.error(`[Bridge] Port ${port} in use, trying next...`);
					continue;
				}
				throw err;
			}
		}
		throw new Error(
			`All ports in range ${portStart}-${portStart + portCount - 1} are in use. ` +
			`Cannot start WebSocket server. Set EDA_WS_PORT_RANGE to increase the range.`,
		);
	}

	start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.wss = new WebSocketServer({
				port: this.port,
				host: '127.0.0.1',
				verifyClient: (info: { origin: string; req: IncomingMessage; secure: boolean }) => {
					if (isAllowedOrigin(info.origin)) {
						return true;
					}
					console.error(`[Bridge] Rejected WebSocket connection from origin: ${info.origin || '(none)'}`);
					return false;
				},
			});

			this.wss.on('listening', () => {
				console.error(`[Bridge] WebSocket Server listening on port ${this.port}`);
				resolve();
			});

			this.wss.on('error', (err) => {
				console.error(`[Bridge] WebSocket Server error:`, err);
				reject(err);
			});

			this.wss.on('connection', (ws) => {
				console.error('[Bridge] EDA Pro Extension connected');
				this.client = ws;

				ws.on('message', (data) => {
					try {
						const response: BridgeResponse = JSON.parse(data.toString());
						this.handleResponse(response);
					} catch (err) {
						console.error('[Bridge] Failed to parse message:', err);
					}
				});

				ws.on('close', () => {
					console.error('[Bridge] EDA Pro Extension disconnected');
					if (this.client === ws) {
						this.client = null;
					}
					// Reject all pending requests
					for (const [id, pending] of this.pendingRequests) {
						clearTimeout(pending.timer);
						pending.reject(new Error('EDA Pro Extension disconnected'));
						this.pendingRequests.delete(id);
					}
				});

				ws.on('error', (err) => {
					console.error('[Bridge] Client error:', err);
				});
			});
		});
	}

	isConnected(): boolean {
		return this.client !== null && this.client.readyState === WebSocket.OPEN;
	}

	async send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
		if (!this.isConnected()) {
			throw new Error('EDA Pro Extension is not connected. Please open EDA Pro and click "Connect Claude" first.');
		}

		const id = String(++this.requestIdCounter);
		const request: BridgeRequest = { id, method, params };

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error(`Request timed out after ${this.timeout}ms: ${method}`));
			}, this.timeout);

			this.pendingRequests.set(id, { resolve, reject, timer });
			this.client!.send(JSON.stringify(request));
		});
	}

	private handleResponse(response: BridgeResponse): void {
		const pending = this.pendingRequests.get(response.id);
		if (!pending) {
			console.error(`[Bridge] Received response for unknown request: ${response.id}`);
			return;
		}

		clearTimeout(pending.timer);
		this.pendingRequests.delete(response.id);

		if (response.error) {
			pending.reject(new Error(response.error));
		} else {
			pending.resolve(response.result);
		}
	}

	async stop(): Promise<void> {
		for (const [id, pending] of this.pendingRequests) {
			clearTimeout(pending.timer);
			pending.reject(new Error('Bridge shutting down'));
			this.pendingRequests.delete(id);
		}

		if (this.client) {
			this.client.close();
			this.client = null;
		}

		return new Promise((resolve) => {
			if (this.wss) {
				this.wss.close(() => {
					console.error('[Bridge] WebSocket Server closed');
					resolve();
				});
			} else {
				resolve();
			}
		});
	}
}
