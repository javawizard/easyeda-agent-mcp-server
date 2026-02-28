import * as extensionConfig from '../../extension.json';
import { connectToMcpServers, disconnectFromAllMcpServers, getConnectedPortCount } from './ws-client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {}

export function connectClaude(): void {
	const alreadyConnected = getConnectedPortCount();
	if (alreadyConnected > 0) {
		eda.sys_Message.showToastMessage(
			`Scanning for new Claude MCP Servers... (${alreadyConnected} already connected)`,
			ESYS_ToastMessageType.INFO,
			3,
		);
	} else {
		eda.sys_Message.showToastMessage('Scanning for Claude MCP Servers...', ESYS_ToastMessageType.INFO, 3);
	}
	try {
		connectToMcpServers(extensionConfig.uuid);
	} catch (err: any) {
		eda.sys_Dialog.showInformationMessage(
			`Failed to connect: ${err instanceof Error ? err.message : String(err)}\n\nMake sure Claude Code is running with the easyeda-agent MCP server configured.`,
			'Connection Error',
		);
	}
}

export function disconnectClaude(): void {
	const count = getConnectedPortCount();
	if (count === 0) {
		eda.sys_Message.showToastMessage('Not connected to any Claude MCP Servers', ESYS_ToastMessageType.WARNING, 3);
		return;
	}
	disconnectFromAllMcpServers(extensionConfig.uuid);
	eda.sys_Message.showToastMessage(
		`Disconnected from ${count} Claude MCP Server${count === 1 ? '' : 's'}`,
		ESYS_ToastMessageType.INFO,
		3,
	);
}

export function about(): void {
	eda.sys_Dialog.showInformationMessage(
		`EasyEDA Agent - MCP Bridge for Claude Code\nVersion ${extensionConfig.version}`,
		'About',
	);
}
