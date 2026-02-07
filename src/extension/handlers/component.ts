export const componentHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'pcb.getAll.component': async (params) => {
		return eda.pcb_PrimitiveComponent.getAll(params.layer);
	},

	'pcb.modify.component': async (params) => {
		return eda.pcb_PrimitiveComponent.modify(params.primitiveId, params.property);
	},

	'pcb.component.getPins': async (params) => {
		return eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(params.primitiveId);
	},
};
