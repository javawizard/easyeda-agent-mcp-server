export const viaHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'pcb.getAll.via': async (params) => {
		return eda.pcb_PrimitiveVia.getAll(params.net);
	},

	'pcb.create.via': async (params) => {
		return eda.pcb_PrimitiveVia.create(
			params.net,
			params.x,
			params.y,
			params.holeDiameter,
			params.diameter,
			params.viaType,
		);
	},

	'pcb.delete.via': async (params) => {
		return eda.pcb_PrimitiveVia.delete(params.ids);
	},
};
