export const libraryHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'lib.device.search': async (params) => {
		return eda.lib_Device.search(
			params.key,
			params.libraryUuid,
			params.classification,
			params.symbolType,
			params.itemsOfPage,
			params.page,
		);
	},

	'lib.device.get': async (params) => {
		return eda.lib_Device.get(params.deviceUuid, params.libraryUuid);
	},

	'lib.device.getByLcscIds': async (params) => {
		return eda.lib_Device.getByLcscIds(params.lcscIds, params.libraryUuid);
	},

	'lib.getSystemLibraryUuid': async () => {
		return eda.lib_LibrariesList.getSystemLibraryUuid();
	},

	'lib.getAllLibraries': async () => {
		return eda.lib_LibrariesList.getAllLibrariesList();
	},
};
