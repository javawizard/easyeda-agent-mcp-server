import * as extensionConfig from '../../extension.json';
import { connectToMcpServers, disconnectFromAllMcpServers, getConnectedPortCount, getInstanceId } from './ws-client';

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

export async function about(): Promise<void> {
	// Get current theme so the dialog can match
	let theme = 'light';
	try {
		theme = await eda.sys_System.getCurrentTheme();
	} catch {
		// Default to light if API unavailable
	}

	// Set data on globalThis for the iframe to read
	(globalThis as any).__claude_about_data__ = {
		instanceId: getInstanceId(),
		version: extensionConfig.version,
		connectedPorts: getConnectedPortCount(),
		theme,
	};

	eda.sys_IFrame.openIFrame('pages/about.html', 380, 370, 'claude-about', {
		title: 'About EasyEDA Agent',
		grayscaleMask: true,
	});
}
