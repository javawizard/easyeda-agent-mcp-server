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

export function about(): void {
	// Theme awareness is disabled: eda.sys_Window.getCurrentTheme() is broken in
	// EasyEDA Pro 2.2.47.7 — the main-thread RPC handler was dropped (the worker
	// stub and the public `getCurrentTheme(): Promise<ESYS_Theme>` type are still
	// present, so this is an EasyEDA regression, not an intentional removal). With
	// nothing answering the RPC, the call only settles via the extension API's
	// 5-minute default timeout, which blocked this handler and stopped the About
	// dialog from ever opening. Hardcode the theme until EasyEDA restores the API.
	const theme = 'light';

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
