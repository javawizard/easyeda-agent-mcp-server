export const netHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'pcb.net.getAllNames': async () => {
		return eda.pcb_Net.getAllNetsName();
	},

	'pcb.net.getPrimitives': async (params) => {
		return eda.pcb_Net.getAllPrimitivesByNet(params.net, params.types);
	},

	'pcb.net.getLength': async (params) => {
		return eda.pcb_Net.getNetLength(params.net);
	},

	'pcb.net.highlight': async (params) => {
		return eda.pcb_Net.highlightNet(params.net);
	},

	'pcb.net.select': async (params) => {
		return eda.pcb_Net.selectNet(params.net);
	},
};
