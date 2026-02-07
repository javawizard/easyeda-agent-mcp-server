export const schDocumentHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'sch.document.save': async () => {
		return eda.sch_Document.save();
	},

	'sch.document.importChanges': async () => {
		return eda.sch_Document.importChanges();
	},

	'sch.drc.check': async (params) => {
		return eda.sch_Drc.check(params.strict, params.userInterface);
	},

	'sch.netlist.get': async (params) => {
		return eda.sch_Netlist.getNetlist(params.type);
	},

	'sch.netlist.set': async (params) => {
		return eda.sch_Netlist.setNetlist(params.type, params.netlist);
	},
};
