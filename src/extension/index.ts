import * as extensionConfig from '../../extension.json';
import { connectToMcpServers, disconnectFromAllMcpServers, getConnectedPortCount, getInstanceId, startLiveMode, stopLiveMode, isLiveModeActive } from './ws-client';

const AUTO_CONNECT_KEY = 'autoConnect';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {
	try {
		const autoConnect = eda.sys_Storage.getExtensionUserConfig(AUTO_CONNECT_KEY);
		if (autoConnect) {
			startLiveMode(extensionConfig.uuid);
			connectToMcpServers(extensionConfig.uuid);
		}
	} catch {
		// Storage API unavailable or failed — skip auto-connect
	}
}

export function connectClaude(): void {
	const wasLive = isLiveModeActive();

	if (!wasLive) {
		startLiveMode(extensionConfig.uuid);
		eda.sys_Storage.setExtensionUserConfig(AUTO_CONNECT_KEY, true).catch(() => {});
		eda.sys_Message.showToastMessage(
			'Live mode enabled — connecting to Claude bridge...',
			ESYS_ToastMessageType.SUCCESS,
			5,
		);
	} else {
		const alreadyConnected = getConnectedPortCount() > 0;
		eda.sys_Message.showToastMessage(
			alreadyConnected
				? `Already connected to Claude bridge (instance: ${(window as any).__claude_mcp_instance_id__ || ''})`
				: 'Reconnecting to Claude bridge...',
			ESYS_ToastMessageType.INFO,
			3,
		);
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
	const wasConnected = getConnectedPortCount() > 0;
	const wasLive = isLiveModeActive();
	stopLiveMode();
	eda.sys_Storage.deleteExtensionUserConfig(AUTO_CONNECT_KEY).catch(() => {});
	disconnectFromAllMcpServers(extensionConfig.uuid);

	if (!wasConnected && !wasLive) {
		eda.sys_Message.showToastMessage('Not connected to Claude bridge', ESYS_ToastMessageType.WARNING, 3);
		return;
	}
	eda.sys_Message.showToastMessage(
		'Live mode disabled — disconnected from Claude bridge',
		ESYS_ToastMessageType.INFO,
		3,
	);
}

export async function about(): Promise<void> {
	// Get current theme so the dialog can match
	let theme = 'light';
	try {
		theme = await eda.sys_Window.getCurrentTheme();
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
