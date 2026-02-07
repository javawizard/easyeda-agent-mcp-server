export const schPrimitiveHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'sch.primitive.getType': async (params) => {
		return eda.sch_Primitive.getPrimitiveTypeByPrimitiveId(params.id);
	},

	'sch.primitive.get': async (params) => {
		return eda.sch_Primitive.getPrimitiveByPrimitiveId(params.id);
	},

	'sch.primitive.getBBox': async (params) => {
		return eda.sch_Primitive.getPrimitivesBBox(params.primitiveIds);
	},
};
