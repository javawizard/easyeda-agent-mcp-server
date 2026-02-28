export const schDocumentHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'sch.document.save': async () => {
		return eda.sch_Document.save();
	},

	'sch.document.importChanges': async () => {
		return eda.sch_Document.importChanges();
	},

	// 3rd param `includeVerboseError` causes the `sch_Drc.check` function to return Array<any> of all DRC errors instead of just a
	// boolean indicating whether or not DRC passed. Added in the @jlceda/pro-api-types NPM
	// package but not yet documented on
	// https://prodocs.easyeda.com/en/api/reference/pro-api.sch_drc.check.html
	'sch.drc.check': async (params) => {
		return eda.sch_Drc.check(params.strict, params.userInterface, true);
	},

	'sch.netlist.get': async (params) => {
		return eda.sch_Netlist.getNetlist(params.type);
	},

	'sch.netlist.set': async (params) => {
		return eda.sch_Netlist.setNetlist(params.type, params.netlist);
	},
};
