export const schWireHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'sch.wire.create': async (params) => {
		return eda.sch_PrimitiveWire.create(
			params.line,
			params.net,
			params.color,
			params.lineWidth,
			params.lineType,
		);
	},

	'sch.wire.delete': async (params) => {
		return eda.sch_PrimitiveWire.delete(params.ids);
	},

	'sch.wire.modify': async (params) => {
		return eda.sch_PrimitiveWire.modify(params.primitiveId, params.property);
	},

	'sch.wire.get': async (params) => {
		return eda.sch_PrimitiveWire.get(params.primitiveIds);
	},

	'sch.wire.getAll': async (params) => {
		return eda.sch_PrimitiveWire.getAll(params.net);
	},
};
