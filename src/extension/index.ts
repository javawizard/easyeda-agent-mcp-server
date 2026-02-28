import * as extensionConfig from '../../extension.json';
import { connectToMcpServer, disconnectFromMcpServer } from './ws-client';

let connected = false;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {}

export function connectClaude(): void {
	if (connected) {
		eda.sys_Message.showToastMessage('Already connected to Claude MCP Server', ESYS_ToastMessageType.WARNING, 3);
		return;
	}
	try {
		eda.sys_Message.showToastMessage('Connecting to Claude MCP Server...', ESYS_ToastMessageType.INFO, 3);
		connectToMcpServer(extensionConfig.uuid, () => {
			connected = true;
		});
	} catch (err: any) {
		eda.sys_Dialog.showInformationMessage(
			`Failed to connect: ${err instanceof Error ? err.message : String(err)}\n\nMake sure Claude Code is running with the easyeda-agent MCP server configured.`,
			'Connection Error',
		);
	}
}

export function disconnectClaude(): void {
	if (!connected) {
		eda.sys_Message.showToastMessage('Not connected to Claude MCP Server', ESYS_ToastMessageType.WARNING, 3);
		return;
	}
	disconnectFromMcpServer(extensionConfig.uuid);
	connected = false;
	eda.sys_Message.showToastMessage('Disconnected from Claude MCP Server', ESYS_ToastMessageType.INFO, 3);
}

export function about(): void {
	eda.sys_Dialog.showInformationMessage(
		`EasyEDA Agent - MCP Bridge for Claude Code\nVersion ${extensionConfig.version}`,
		'About',
	);
}
