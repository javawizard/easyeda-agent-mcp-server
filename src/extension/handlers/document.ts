export const documentHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'pcb.document.save': async (params) => {
		return eda.pcb_Document.save(params.uuid);
	},

	'pcb.document.navigateTo': async (params) => {
		return eda.pcb_Document.navigateToCoordinates(params.x, params.y);
	},

	'pcb.getAll.pad': async (params) => {
		return eda.pcb_PrimitivePad.getAll(params.layer, params.net);
	},

	'pcb.select.getAll': async () => {
		return eda.pcb_SelectControl.getAllSelectedPrimitives();
	},
};
