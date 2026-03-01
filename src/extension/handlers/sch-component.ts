import { fetchParsedNetlist } from './sch-netlist-utils';

export const schComponentHandlers: Record<string, (params: Record<string, any>) => Promise<any>> = {
	'sch.component.create': async (params) => {
		return eda.sch_PrimitiveComponent.create(
			params.component,
			params.x,
			params.y,
			params.subPartName,
			params.rotation,
			params.mirror,
			params.addIntoBom,
			params.addIntoPcb,
		);
	},

	'sch.component.createNetFlag': async (params) => {
		return eda.sch_PrimitiveComponent.createNetFlag(
			params.identification,
			params.net,
			params.x,
			params.y,
			params.rotation,
			params.mirror,
		);
	},

	'sch.component.createNetPort': async (params) => {
		return eda.sch_PrimitiveComponent.createNetPort(
			params.direction,
			params.net,
			params.x,
			params.y,
			params.rotation,
			params.mirror,
		);
	},

	'sch.component.delete': async (params) => {
		return eda.sch_PrimitiveComponent.delete(params.ids);
	},

	'sch.component.modify': async (params) => {
		return eda.sch_PrimitiveComponent.modify(params.primitiveId, params.property);
	},

	'sch.component.get': async (params) => {
		return eda.sch_PrimitiveComponent.get(params.primitiveIds);
	},

	'sch.component.getAll': async (params) => {
		return eda.sch_PrimitiveComponent.getAll(params.componentType, params.allSchematicPages);
	},

	'sch.component.getAllPins': async (params) => {
		const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(params.primitiveId);
		if (!Array.isArray(pins) || pins.length === 0) return pins;

		// Look up the component's uniqueId, then find its nets in the netlist
		const rawComp: any = await eda.sch_PrimitiveComponent.get(params.primitiveId);
		const comp = Array.isArray(rawComp) ? rawComp[0] : rawComp;
		if (!comp?.uniqueId) return pins;

		const netlist = await fetchParsedNetlist();
		const netEntry = netlist[comp.uniqueId];
		if (!netEntry) return pins;

		return pins.map((pin: any) => ({
			...pin,
			net: netEntry.pins[String(pin.pinNumber)] ?? '',
		}));
	},
};
