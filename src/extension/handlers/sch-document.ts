import { fetchParsedNetlist, fetchPinNames } from './sch-netlist-utils';

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

	'sch.connectivity.get': async (params) => {
		const designatorFilter: Set<string> | undefined = params.designators
			? new Set(params.designators as string[])
			: undefined;
		const netFilter: Set<string> | undefined = params.nets
			? new Set(params.nets as string[])
			: undefined;

		// 1. Fetch parsed netlist and all components
		const [netlist, allComponents] = await Promise.all([
			fetchParsedNetlist(),
			(eda.sch_PrimitiveComponent as any).getAll('part', true),
		]);

		// 2. Build uniqueId → primitiveId map
		const uniqueToPrimitive: Record<string, string> = {};
		if (Array.isArray(allComponents)) {
			for (const comp of allComponents) {
				const c = comp as any;
				if (c.uniqueId && c.primitiveId) {
					uniqueToPrimitive[c.uniqueId] = c.primitiveId;
				}
			}
		}

		// 3. Fetch pin names for each component in parallel
		const pinNamesMap: Record<string, Record<string, string>> = {}; // uniqueId → pinNumber → pinName
		const fetchPromises: Promise<void>[] = [];
		for (const [uniqueId, entry] of Object.entries(netlist)) {
			const primitiveId = uniqueToPrimitive[uniqueId];
			if (!primitiveId) continue;
			// If filtering by designator, skip components not in the filter
			if (designatorFilter && !designatorFilter.has(entry.designator)) continue;
			fetchPromises.push(
				fetchPinNames(primitiveId).then((names) => {
					pinNamesMap[uniqueId] = names;
				}),
			);
		}
		await Promise.all(fetchPromises);

		// 4. Build nets view: netName → ["designator.pinNumber(pinName)", ...]
		const netsView: Record<string, string[]> = {};
		// 5. Build components view: designator → { part, pins: { pinNumber: { name, net } } }
		const componentsView: Record<string, { part: string; pins: Record<string, { name: string; net: string }> }> = {};

		// Track which designators have pins on filtered nets (for net-based filtering)
		const designatorsOnFilteredNets = new Set<string>();

		for (const [uniqueId, entry] of Object.entries(netlist)) {
			if (!uniqueToPrimitive[uniqueId]) continue;
			if (designatorFilter && !designatorFilter.has(entry.designator)) continue;

			const pinNames = pinNamesMap[uniqueId] || {};
			const compPins: Record<string, { name: string; net: string }> = {};
			let hasMatchingNet = false;

			for (const [pinNumber, netName] of Object.entries(entry.pins)) {
				const pinName = pinNames[pinNumber] || '';

				// Check if this pin's net matches the net filter
				if (netFilter && netName && netFilter.has(netName)) {
					hasMatchingNet = true;
				}

				// Build component pins view (always include all pins for included components)
				compPins[pinNumber] = { name: pinName, net: netName };

				// Build nets view: skip unconnected and auto-generated single-connection nets
				if (!netName || netName.startsWith('$')) continue;

				if (!netsView[netName]) netsView[netName] = [];
				const label = pinName
					? `${entry.designator}.${pinNumber}(${pinName})`
					: `${entry.designator}.${pinNumber}`;
				netsView[netName].push(label);
			}

			if (netFilter && !hasMatchingNet) continue;
			if (netFilter) designatorsOnFilteredNets.add(entry.designator);

			componentsView[entry.designator] = {
				part: entry.part,
				pins: compPins,
			};
		}

		// 6. Apply net filter to nets view
		let filteredNets = netsView;
		if (netFilter) {
			filteredNets = {};
			for (const netName of netFilter) {
				if (netsView[netName]) {
					filteredNets[netName] = netsView[netName];
				}
			}
		}

		// If filtering by designator but not by net, only include nets that touch filtered components
		if (designatorFilter && !netFilter) {
			const relevantNets: Record<string, string[]> = {};
			for (const [netName, connections] of Object.entries(filteredNets)) {
				const relevant = connections.some((conn) => {
					const designator = conn.split('.')[0];
					return designatorFilter.has(designator);
				});
				if (relevant) {
					relevantNets[netName] = connections;
				}
			}
			filteredNets = relevantNets;
		}

		return { nets: filteredNets, components: componentsView };
	},
};
