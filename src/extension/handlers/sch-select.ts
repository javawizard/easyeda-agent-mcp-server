// EasyEDA schematic selection API quirks:
//
// - doSelectPrimitives() returns true but silently does nothing in schematic context.
//   It may only work in the symbol editor. Use doCrossProbeSelect() instead.
//
// - doCrossProbeSelect() is the method that actually selects/highlights in the schematic
//   editor, despite its name suggesting PCB↔schematic cross-probing. It takes designators,
//   pins (as "U1_1" format), and net names.
//
// - clearSelected() returns true but does nothing in schematic context (same bug as
//   doSelectPrimitives). It works correctly on the PCB side. There is currently no
//   programmatic way to clear schematic selection; the user must click empty space.
//
// - Selection via doCrossProbeSelect is additive — each call adds to the current selection.

export const schSelectHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'sch.select.getAll': async () => {
		return eda.sch_SelectControl.getAllSelectedPrimitives();
	},

	'sch.select.getAllIds': async () => {
		return eda.sch_SelectControl.getAllSelectedPrimitives_PrimitiveId();
	},

	// Broken: returns true but does nothing. Kept for reference.
	'sch.select.select': async (params) => {
		return eda.sch_SelectControl.doSelectPrimitives(params.primitiveIds);
	},

	// This is the method that actually works for schematic selection.
	'sch.select.crossProbe': async (params) => {
		return eda.sch_SelectControl.doCrossProbeSelect(
			params.components,
			params.pins,
			params.nets,
			params.highlight,
			params.select,
		);
	},

	// Broken: returns true but does nothing. Works on PCB side (pcb_SelectControl.clearSelected).
	'sch.select.clear': async () => {
		return eda.sch_SelectControl.clearSelected();
	},
};
