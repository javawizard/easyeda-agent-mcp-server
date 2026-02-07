export const drcHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'pcb.drc.check': async (params) => {
		return eda.pcb_Drc.check(params.strict, params.ui, params.verbose);
	},

	'pcb.drc.getRuleConfiguration': async () => {
		return eda.pcb_Drc.getCurrentRuleConfiguration();
	},

	'pcb.drc.getNetRules': async () => {
		return eda.pcb_Drc.getNetRules();
	},

	'pcb.drc.getDiffPairs': async () => {
		return eda.pcb_Drc.getAllDifferentialPairs();
	},

	'pcb.drc.getEqualLengthGroups': async () => {
		return eda.pcb_Drc.getAllEqualLengthNetGroups();
	},
};
