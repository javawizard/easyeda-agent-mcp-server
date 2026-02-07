import * as extensionConfig from '../../extension.json';
import { connectToMcpServer, disconnectFromMcpServer } from './ws-client';

let connected = false;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {}

export function connectClaude(): void {
	if (connected) {
		eda.sys_Message.showWarningMessage('Already connected to Claude MCP Server');
		return;
	}
	try {
		connectToMcpServer(extensionConfig.uuid);
		connected = true;
	} catch (err: any) {
		eda.sys_Dialog.showErrorMessage(
			`Failed to connect: ${err instanceof Error ? err.message : String(err)}`,
			'Connection Error',
		);
	}
}

export function disconnectClaude(): void {
	if (!connected) {
		eda.sys_Message.showWarningMessage('Not connected to Claude MCP Server');
		return;
	}
	disconnectFromMcpServer(extensionConfig.uuid);
	connected = false;
	eda.sys_Message.showMessage('Disconnected from Claude MCP Server');
}

export function about(): void {
	eda.sys_Dialog.showInformationMessage(
		`EasyEDA Agent - MCP Bridge for Claude Code\nVersion ${extensionConfig.version}`,
		'About',
	);
}
